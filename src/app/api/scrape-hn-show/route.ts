import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Pulls Show HN posts from the last 7 days, extracts GitHub repo URLs,
 * resolves each to repo metadata via the GitHub API, and upserts into
 * the external_repos cache table.
 *
 * Auth: in production, requires `Authorization: Bearer ${CRON_SECRET}` (Vercel
 * Cron sets this automatically when CRON_SECRET is configured). If CRON_SECRET
 * is not set in env, the route runs unauthenticated — fine for local dev,
 * dangerous in production. Always set CRON_SECRET on Vercel.
 *
 * Schedule: see vercel.json (daily at 06:00 UTC).
 */

const HN_DAYS = 7;
const HN_HITS_PER_PAGE = 100; // Algolia max
const HN_MIN_POINTS = 5; // ignore zero-traction posts

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  story_text?: string | null;
  created_at_i: number;
  points: number | null;
  num_comments: number | null;
  author: string;
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
  // Strip common suffixes
  const cleanRepo = repo.replace(/\.git$/, "");
  if (!owner || !cleanRepo) return null;
  return `${owner}/${cleanRepo}`;
}

async function fetchHNShowPosts(): Promise<HNHit[]> {
  const since = Math.floor(Date.now() / 1000) - HN_DAYS * 86400;
  const url =
    `https://hn.algolia.com/api/v1/search?` +
    `tags=show_hn` +
    `&numericFilters=created_at_i>${since},points>=${HN_MIN_POINTS}` +
    `&hitsPerPage=${HN_HITS_PER_PAGE}` +
    `&page=0`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HN Algolia returned ${res.status}`);
  const data = (await res.json()) as { hits: HNHit[] };
  return data.hits || [];
}

async function fetchRepoMetadata(fullName: string, ghToken?: string): Promise<GHRepo | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Stella-App/1.0",
  };
  if (ghToken) headers.Authorization = `token ${ghToken}`;
  const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404 || res.status === 451) return null;
    if (res.status === 403 || res.status === 429) {
      console.warn(`[hn-scrape] GitHub rate-limited fetching ${fullName} (${res.status})`);
      return null;
    }
    return null;
  }
  return (await res.json()) as GHRepo;
}

export async function POST(request: Request) {
  // Cron auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Only enforce when set.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let hits: HNHit[];
  try {
    hits = await fetchHNShowPosts();
  } catch (err) {
    console.error("[hn-scrape] Algolia fetch failed:", err);
    return NextResponse.json({ error: "HN fetch failed" }, { status: 502 });
  }

  // Build a map of repo_full_name → best HN post (by points). Many Show HN posts
  // link to the same repo; we keep the highest-scoring one.
  const candidates = new Map<string, HNHit>();
  for (const hit of hits) {
    const fullName = extractRepoFullName(hit.url);
    if (!fullName) continue;
    const existing = candidates.get(fullName);
    if (!existing || (hit.points ?? 0) > (existing.points ?? 0)) {
      candidates.set(fullName, hit);
    }
  }

  if (candidates.size === 0) {
    return NextResponse.json({ scraped: 0, kept: 0, message: "No GitHub repos in last week's Show HN" });
  }

  const supabase = createAdminClient();

  // Skip repos we already have a fresh entry for (avoid hammering GitHub).
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

  const ghToken = process.env.GITHUB_API_TOKEN; // optional; raises rate limit 60→5000/hr
  const rows: Array<Record<string, unknown>> = [];
  for (const [fullName, hit] of candidates) {
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
      source: "hn_show",
      source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source_score: hit.points ?? 0,
      posted_at: new Date(hit.created_at_i * 1000).toISOString(),
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ scraped: candidates.size, kept: 0, skipped_fresh: stillFresh.size });
  }

  const { error } = await supabase
    .from("external_repos")
    .upsert(rows, { onConflict: "repo_full_name" });

  if (error) {
    console.error("[hn-scrape] upsert failed:", error);
    return NextResponse.json({ error: "Persist failed", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    scraped: candidates.size,
    kept: rows.length,
    skipped_fresh: stillFresh.size,
  });
}

// GET also supported so Vercel Cron's GET pings work without changes
export async function GET(request: Request) {
  return POST(request);
}
