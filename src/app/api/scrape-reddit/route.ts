import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Pulls top posts from a curated list of dev-relevant subreddits, extracts
 * GitHub repo URLs, fetches each repo's metadata, and upserts into the
 * external_repos cache with source `reddit_<subreddit>`.
 *
 * Mirrors the auth/error-handling shape of /api/scrape-hn-show. Runs daily on
 * its own Vercel Cron entry so HN and Reddit don't share a single timeout budget.
 */

// Reddit blocks requests with a generic User-Agent — must look like a real client.
const USER_AGENT = "Stella-App/1.0 (https://stella-app-delta.vercel.app; +https://github.com/mcravi8/stella-app)";

const SUBREDDITS = [
  "programming",
  "MachineLearning",
  "rust",
  "golang",
  "Python",
  "webdev",
  "opensource",
];
const REDDIT_TIME = "week"; // top of last 7 days
const REDDIT_LIMIT = 25;
const REDDIT_MIN_SCORE = 10;

interface RedditChild {
  data: {
    title: string;
    url: string;
    permalink: string;
    score: number;
    created_utc: number;
    is_self: boolean;
    over_18: boolean;
    stickied: boolean;
    author: string;
    subreddit: string;
  };
}

interface RedditListing {
  data: { children: RedditChild[] };
}

interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  html_url: string;
  owner: { avatar_url: string; login: string };
}

const RESERVED_OWNER_PATHS = new Set([
  "search", "topics", "trending", "marketplace", "sponsors",
  "issues", "pulls", "explore", "settings", "notifications", "new",
  "orgs", "events", "features", "pricing", "contact", "about",
  "login", "join", "logout", "account", "site", "security",
  "readme", "codespaces", "copilot", "dashboard", "watching",
  "stars", "discussions", "advisories",
]);

function extractRepoFullName(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!u.hostname.endsWith("github.com")) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (RESERVED_OWNER_PATHS.has(owner.toLowerCase())) return null;
  const cleanRepo = repo.replace(/\.git$/, "");
  if (!owner || !cleanRepo) return null;
  return `${owner}/${cleanRepo}`;
}

interface SubResult {
  sub: string;
  status: number;
  count: number;
  github_links: number;
  error?: string;
}

async function fetchSubredditTop(sub: string): Promise<{ children: RedditChild[]; result: SubResult }> {
  const url = `https://www.reddit.com/r/${sub}/top.json?t=${REDDIT_TIME}&limit=${REDDIT_LIMIT}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[reddit-scrape] r/${sub} returned ${res.status}: ${body.slice(0, 200)}`);
      return {
        children: [],
        result: { sub, status: res.status, count: 0, github_links: 0, error: body.slice(0, 200) },
      };
    }
    const data = (await res.json()) as RedditListing;
    const children = data?.data?.children ?? [];
    const githubLinks = children.filter(c => extractRepoFullName(c.data.url) !== null).length;
    return {
      children,
      result: { sub, status: res.status, count: children.length, github_links: githubLinks },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[reddit-scrape] r/${sub} fetch threw:`, message);
    return { children: [], result: { sub, status: 0, count: 0, github_links: 0, error: message } };
  }
}

async function fetchRepoMetadata(fullName: string, ghToken?: string): Promise<GHRepo | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Stella-App/1.0",
  };
  if (ghToken) headers.Authorization = `token ${ghToken}`;
  const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      console.warn(`[reddit-scrape] GitHub rate-limited fetching ${fullName} (${res.status})`);
    }
    return null;
  }
  return (await res.json()) as GHRepo;
}

async function runScrape(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY env var is not set on this deployment" },
      { status: 500 }
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL env var is not set on this deployment" },
      { status: 500 }
    );
  }

  // Fetch all subreddits in parallel, then walk results sequentially so we keep
  // the highest-scoring post per repo (some repos get linked from multiple subs).
  type Best = { sub: string; child: RedditChild };
  const candidates = new Map<string, Best>();
  const subResults: SubResult[] = [];

  const responses = await Promise.allSettled(SUBREDDITS.map(s => fetchSubredditTop(s)));
  responses.forEach((res, idx) => {
    if (res.status !== "fulfilled") {
      subResults.push({
        sub: SUBREDDITS[idx],
        status: 0,
        count: 0,
        github_links: 0,
        error: String(res.reason),
      });
      return;
    }
    const sub = SUBREDDITS[idx];
    subResults.push(res.value.result);
    for (const child of res.value.children) {
      const d = child.data;
      if (d.is_self || d.over_18 || d.stickied) continue;
      if ((d.score ?? 0) < REDDIT_MIN_SCORE) continue;
      const fullName = extractRepoFullName(d.url);
      if (!fullName) continue;
      const existing = candidates.get(fullName);
      if (!existing || (d.score ?? 0) > (existing.child.data.score ?? 0)) {
        candidates.set(fullName, { sub, child });
      }
    }
  });

  if (candidates.size === 0) {
    return NextResponse.json({
      scraped: 0,
      kept: 0,
      message: "No GitHub repos in last week's top posts",
      sub_results: subResults,
    });
  }

  const supabase = createAdminClient();
  const fullNames = Array.from(candidates.keys());
  const { data: existing } = await supabase
    .from("external_repos")
    .select("repo_full_name, expires_at")
    .in("repo_full_name", fullNames);
  const stillFresh = new Set(
    (existing || [])
      .filter(r => r.expires_at && new Date(r.expires_at) > new Date(Date.now() + 7 * 86400_000))
      .map(r => r.repo_full_name)
  );

  const ghToken = process.env.GITHUB_API_TOKEN;
  const rows: Array<Record<string, unknown>> = [];
  for (const [fullName, best] of candidates) {
    if (stillFresh.has(fullName)) continue;
    const meta = await fetchRepoMetadata(fullName, ghToken);
    if (!meta) continue;
    if (meta.fork || meta.archived) continue;
    rows.push({
      repo_full_name: meta.full_name,
      repo_data: {
        id: meta.id,
        full_name: meta.full_name,
        name: meta.name,
        description: meta.description,
        language: meta.language,
        topics: meta.topics ?? [],
        stargazers_count: meta.stargazers_count,
        forks_count: meta.forks_count,
        html_url: meta.html_url,
        owner: { avatar_url: meta.owner.avatar_url, login: meta.owner.login },
      },
      // source preserves the original subreddit casing — display layer turns it into "via r/<sub>".
      source: `reddit_${best.sub}`,
      source_url: `https://www.reddit.com${best.child.data.permalink}`,
      source_score: best.child.data.score ?? 0,
      posted_at: new Date(best.child.data.created_utc * 1000).toISOString(),
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      scraped: candidates.size,
      kept: 0,
      skipped_fresh: stillFresh.size,
      sub_results: subResults,
    });
  }

  const { error } = await supabase
    .from("external_repos")
    .upsert(rows, { onConflict: "repo_full_name" });

  if (error) {
    console.error("[reddit-scrape] upsert failed:", error);
    return NextResponse.json({ error: "Persist failed", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    scraped: candidates.size,
    kept: rows.length,
    skipped_fresh: stillFresh.size,
    sub_results: subResults,
  });
}

async function safeRun(request: Request): Promise<NextResponse> {
  try {
    return await runScrape(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reddit-scrape] unhandled error:", err);
    return NextResponse.json({ error: "Scraper crashed", details: message }, { status: 500 });
  }
}

export async function POST(request: Request) { return safeRun(request); }
export async function GET(request: Request) { return safeRun(request); }
