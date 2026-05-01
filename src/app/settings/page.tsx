import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

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

async function fetchOwnRepos(token: string | null, username: string): Promise<GHRepo[]> {
  if (!token) {
    // Public-only fallback when there's no provider token (covers private repos at the cost of completeness).
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=100`,
      { headers: { "User-Agent": "Stella-App/1.0" }, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    return (await res.json()) as GHRepo[];
  }
  // Authenticated request returns private + public for the logged-in user.
  const res = await fetch(
    `https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Stella-App/1.0",
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return [];
  return (await res.json()) as GHRepo[];
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = user.user_metadata?.user_name || "";

  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token ?? null;

  const [
    { data: interests },
    { data: showcased },
    { data: profile },
    ghRepos,
  ] = await Promise.all([
    supabase.from("user_interests").select("tag").eq("user_id", user.id),
    supabase
      .from("showcased_repos")
      .select("repo_full_name, repo_data, position")
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase.from("profiles").select("bio").eq("user_id", user.id).single(),
    fetchOwnRepos(providerToken, username),
  ]);

  // Hide forks and archived repos from the picker — these are rarely "your work".
  // Sort: stars desc, then most recently pushed.
  const ownRepos = ghRepos
    .filter(r => !r.fork && !r.archived)
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (b.id - a.id))
    .map(r => ({
      id: r.id,
      full_name: r.full_name,
      name: r.name,
      description: r.description,
      language: r.language,
      stargazers_count: r.stargazers_count,
      owner: { avatar_url: r.owner.avatar_url, login: r.owner.login },
    }));

  // Currently-showcased repos in their saved order. Includes anything previously
  // showcased even if it's no longer in ownRepos (e.g. an old starred-repo selection)
  // so the user can see and explicitly remove it.
  const showcasedRepoData = (showcased || [])
    .filter(r => r.repo_data)
    .map(r => r.repo_data);

  return (
    <SettingsClient
      username={username}
      initialInterests={(interests || []).map(i => i.tag)}
      ownRepos={ownRepos}
      showcasedRepos={showcasedRepoData}
      initialBio={profile?.bio ?? null}
    />
  );
}
