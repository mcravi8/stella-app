import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const PER_PAGE = 100;
const MAX_PAGES = 5; // hard cap → up to 500 stars imported on first run

interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  owner: { avatar_url: string; login: string };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("imported_stars_at")
    .eq("user_id", user.id)
    .single();

  if (profile?.imported_stars_at) {
    return NextResponse.json({ skipped: true, reason: "already_imported" });
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.provider_token;
  if (!token) {
    return NextResponse.json(
      { error: "Missing GitHub provider token; sign out and back in to grant access" },
      { status: 400 }
    );
  }

  const ghHeaders = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Stella-App/1.0",
  };

  const stars: GHRepo[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.github.com/user/starred?per_page=${PER_PAGE}&page=${page}&sort=created&direction=desc`,
      { headers: ghHeaders }
    );
    if (!res.ok) {
      console.error("[/api/import-stars] github fetch failed:", res.status, await res.text());
      return NextResponse.json(
        { error: "GitHub API request failed", status: res.status },
        { status: 502 }
      );
    }
    const batch = (await res.json()) as GHRepo[];
    if (!batch.length) break;
    stars.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  if (stars.length === 0) {
    await supabase
      .from("profiles")
      .update({ imported_stars_at: new Date().toISOString() })
      .eq("user_id", user.id);
    return NextResponse.json({ imported: 0 });
  }

  const rows = stars.map(r => ({
    user_id: user.id,
    repo_full_name: r.full_name,
    direction: "right",
    repo_data: {
      id: r.id,
      full_name: r.full_name,
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics ?? [],
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      html_url: r.html_url,
      owner: { avatar_url: r.owner.avatar_url, login: r.owner.login },
    },
  }));

  const { error: insertError } = await supabase
    .from("swipes")
    .upsert(rows, { onConflict: "user_id,repo_full_name", ignoreDuplicates: true });

  if (insertError) {
    console.error("[/api/import-stars] swipes upsert failed:", insertError);
    return NextResponse.json(
      { error: "Failed to save imported stars", details: insertError.message },
      { status: 500 }
    );
  }

  const { error: markError } = await supabase
    .from("profiles")
    .update({ imported_stars_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (markError) {
    console.error("[/api/import-stars] profile update failed:", markError);
  }

  return NextResponse.json({ imported: stars.length, capped: stars.length === MAX_PAGES * PER_PAGE });
}
