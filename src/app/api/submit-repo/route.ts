import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function parseGitHubUrl(input: string): string | null {
  const cleaned = input.trim().replace(/\/+$/, "");
  const urlMatch = cleaned.match(/github\.com\/([\w.-]+\/[\w.-]+)/);
  if (urlMatch) return urlMatch[1].replace(/\.git$/, "");
  if (/^[\w.-]+\/[\w.-]+$/.test(cleaned)) return cleaned;
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to submit a repo" }, { status: 401 });
  }

  const body = await request.json();
  const { url, note } = body;

  if (!url) {
    return NextResponse.json({ error: "GitHub URL is required" }, { status: 400 });
  }

  const repoFullName = parseGitHubUrl(url);
  if (!repoFullName) {
    return NextResponse.json({ error: "Invalid GitHub URL. Use: https://github.com/owner/repo" }, { status: 400 });
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from("submitted_repos")
    .select("id, status")
    .eq("repo_full_name", repoFullName)
    .maybeSingle();

  if (existing) {
    const msg = existing.status === "approved" ? "already in the discovery pool" : "already submitted and pending review";
    return NextResponse.json({ error: `${repoFullName} is ${msg}` }, { status: 409 });
  }

  // Validate with GitHub API
  let ghRepo: Record<string, unknown>;
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Stella-App/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!ghRes.ok) {
      if (ghRes.status === 404) {
        return NextResponse.json({ error: "Repository not found on GitHub" }, { status: 404 });
      }
      return NextResponse.json({ error: "Could not verify repo on GitHub. Try again." }, { status: 502 });
    }
    ghRepo = await ghRes.json();
  } catch {
    return NextResponse.json({ error: "Network error verifying repo. Try again." }, { status: 502 });
  }

  const stars = ghRepo.stargazers_count as number;
  const description = ghRepo.description as string | null;
  const ownerData = ghRepo.owner as { avatar_url: string; login: string };

  // Auto-approve if meets quality bar: min 50 stars + has description
  const status = stars >= 50 && description ? "approved" : "pending";

  const repoData = {
    id: ghRepo.id as number,
    full_name: ghRepo.full_name as string,
    name: ghRepo.name as string,
    description,
    language: ghRepo.language as string | null,
    topics: (ghRepo.topics as string[]) || [],
    stargazers_count: stars,
    forks_count: ghRepo.forks_count as number,
    html_url: ghRepo.html_url as string,
    owner: { avatar_url: ownerData.avatar_url, login: ownerData.login },
  };

  const submitterUsername =
    (user.user_metadata?.user_name as string) ||
    (user.user_metadata?.name as string) ||
    "unknown";

  const { error: insertError } = await supabase.from("submitted_repos").insert({
    repo_full_name: repoFullName,
    submitted_by: user.id,
    submitter_username: submitterUsername,
    submitter_note: note || null,
    status,
    repo_data: repoData,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: "Failed to submit repo. Please try again." }, { status: 500 });
  }

  const message =
    status === "approved"
      ? "Repo added to the discovery pool! Others can now discover it."
      : "Submitted for review — repos with 50+ stars and a description are auto-approved.";

  return NextResponse.json({ success: true, status, message, repo: repoData });
}
