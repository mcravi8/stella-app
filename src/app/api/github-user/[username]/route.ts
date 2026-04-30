import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ username: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { username } = await params;

  const ghHeaders = {
    "User-Agent": "Stella-App/1.0",
    Accept: "application/vnd.github+json",
  };

  const userRes = await fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders });
  if (!userRes.ok) {
    return NextResponse.json(
      { error: userRes.status === 404 ? "User not found on GitHub" : "GitHub API error" },
      { status: userRes.status }
    );
  }
  const github_user = await userRes.json();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("github_username", username)
    .single();

  let repos = [];
  if (profile) {
    const { data: showcased } = await supabase
      .from("showcased_repos")
      .select("repo_data")
      .eq("user_id", profile.user_id);
    repos = (showcased || []).map(r => r.repo_data).filter(Boolean);
  }
  if (!repos.length) {
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=stars&per_page=30&type=public`,
      { headers: ghHeaders }
    );
    if (reposRes.ok) repos = await reposRes.json();
  }

  return NextResponse.json({ github_user, repos, has_stella_profile: !!profile });
}
