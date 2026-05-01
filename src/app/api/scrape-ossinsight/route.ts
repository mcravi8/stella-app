import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Pulls trending repos from OSSInsight (https://ossinsight.io) — a hosted
 * analytics service that tracks GitHub star velocity, PR activity, etc. and
 * exposes a free public API. We use it as a "what's actually moving on
 * GitHub right now" signal that pure GitHub Search can't surface (Search
 * sorts by absolute stars, not by recent traction).
 *
 * Replaces the Reddit scraper, which got 403'd from Vercel datacenter IPs on
 * every subreddit. OSSInsight has no IP-based blocking.
 *
 * The OSSInsight response already includes description, stars, forks, language
 * — so we don't need a follow-up GitHub API call. Avatar and html_url are
 * synthesized from the repo_name (GitHub serves owner avatars at /<login>.png).
 */

const OSSI_LANGUAGES = ["JavaScript", "TypeScript", "Python", "Rust", "Go", "Java"];
const OSSI_LIMIT_PER_LANG = 10; // top N per language to keep the feed varied

interface OssiRow {
  repo_id: string;
  repo_name: string;
  primary_language: string | null;
  description: string | null;
  stars: string;
  forks: string;
  total_score: string;
}

interface OssiResponse {
  data?: { rows?: OssiRow[] };
  message?: string;
}

interface LangResult {
  language: string;
  status: number;
  count: number;
  error?: string;
}

async function fetchTrending(language: string): Promise<{ rows: OssiRow[]; result: LangResult }> {
  const url = `https://api.ossinsight.io/v1/trends/repos/?period=past_week&language=${encodeURIComponent(language)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Stella-App/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { rows: [], result: { language, status: res.status, count: 0, error: body.slice(0, 200) } };
    }
    const data = (await res.json()) as OssiResponse;
    const rows = data?.data?.rows ?? [];
    return { rows, result: { language, status: res.status, count: rows.length } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], result: { language, status: 0, count: 0, error: message } };
  }
}

function rowToRepoData(row: OssiRow) {
  const [ownerLogin] = row.repo_name.split("/");
  return {
    id: parseInt(row.repo_id, 10) || 0,
    full_name: row.repo_name,
    name: row.repo_name.split("/")[1] ?? row.repo_name,
    description: row.description,
    language: row.primary_language,
    topics: [] as string[], // OSSInsight doesn't expose topics; left empty so the card just hides them
    stargazers_count: parseInt(row.stars, 10) || 0,
    forks_count: parseInt(row.forks, 10) || 0,
    html_url: `https://github.com/${row.repo_name}`,
    // GitHub serves a default avatar image for any owner at <login>.png
    owner: { avatar_url: `https://github.com/${ownerLogin}.png`, login: ownerLogin },
  };
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

  type Best = { language: string; score: number; row: OssiRow };
  const candidates = new Map<string, Best>();
  const langResults: LangResult[] = [];

  const responses = await Promise.allSettled(OSSI_LANGUAGES.map(l => fetchTrending(l)));
  responses.forEach((res, idx) => {
    if (res.status !== "fulfilled") {
      langResults.push({
        language: OSSI_LANGUAGES[idx],
        status: 0,
        count: 0,
        error: String(res.reason),
      });
      return;
    }
    langResults.push(res.value.result);
    const top = res.value.rows.slice(0, OSSI_LIMIT_PER_LANG);
    for (const row of top) {
      const score = parseFloat(row.total_score) || 0;
      const existing = candidates.get(row.repo_name);
      if (!existing || score > existing.score) {
        candidates.set(row.repo_name, { language: res.value.result.language, score, row });
      }
    }
  });

  if (candidates.size === 0) {
    return NextResponse.json({
      scraped: 0,
      kept: 0,
      message: "OSSInsight returned no trending repos",
      lang_results: langResults,
    });
  }

  const supabase = createAdminClient();

  // Refresh entries every 7 days — trending rotates fast.
  const fullNames = Array.from(candidates.keys());
  const { data: existing } = await supabase
    .from("external_repos")
    .select("repo_full_name, expires_at, source")
    .in("repo_full_name", fullNames);
  const stillFresh = new Set(
    (existing || [])
      .filter(r => {
        if (!r.expires_at) return false;
        // Always overwrite if the prior entry was from a different (e.g. HN) source.
        if (r.source !== "ossinsight") return false;
        return new Date(r.expires_at) > new Date(Date.now() + 3 * 86400_000);
      })
      .map(r => r.repo_full_name)
  );

  const rows: Array<Record<string, unknown>> = [];
  for (const [fullName, best] of candidates) {
    if (stillFresh.has(fullName)) continue;
    rows.push({
      repo_full_name: fullName,
      repo_data: rowToRepoData(best.row),
      source: "ossinsight",
      source_url: `https://ossinsight.io/analyze/${fullName}`,
      source_score: Math.round(best.score),
      posted_at: new Date().toISOString(), // OSSInsight doesn't return a per-row timestamp; use fetch time
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 86400_000).toISOString(), // shorter TTL — trending data goes stale
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      scraped: candidates.size,
      kept: 0,
      skipped_fresh: stillFresh.size,
      lang_results: langResults,
    });
  }

  const { error } = await supabase
    .from("external_repos")
    .upsert(rows, { onConflict: "repo_full_name" });

  if (error) {
    console.error("[ossinsight] upsert failed:", error);
    return NextResponse.json({ error: "Persist failed", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    scraped: candidates.size,
    kept: rows.length,
    skipped_fresh: stillFresh.size,
    lang_results: langResults,
  });
}

async function safeRun(request: Request): Promise<NextResponse> {
  try {
    return await runScrape(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ossinsight] unhandled error:", err);
    return NextResponse.json({ error: "Scraper crashed", details: message }, { status: 500 });
  }
}

export async function POST(request: Request) { return safeRun(request); }
export async function GET(request: Request) { return safeRun(request); }
