import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("github_username", username)
    .single();

  const ghRes = await fetch(`https://api.github.com/users/${username}`, {
    headers: { "User-Agent": "Stella-App/1.0" },
    next: { revalidate: 300 },
  });
  if (!ghRes.ok) notFound();
  const ghUser = await ghRes.json();

  let repos: Record<string, unknown>[] = [];
  if (profile) {
    const { data: showcased } = await supabase
      .from("showcased_repos")
      .select("repo_data")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false });
    repos = (showcased || []).map(r => r.repo_data).filter(Boolean);
  }
  if (!repos.length) {
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=stars&per_page=20&type=public`,
      { headers: { "User-Agent": "Stella-App/1.0" }, next: { revalidate: 300 } }
    );
    if (reposRes.ok) repos = await reposRes.json();
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = user?.user_metadata?.user_name === username;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-sm z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg">Stella</span>
          </Link>
          {isOwn && (
            <Link href="/settings" className="text-muted hover:text-accent text-sm transition-colors">Edit profile</Link>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex gap-5 items-start mb-10">
          <Image src={ghUser.avatar_url} alt={username} width={88} height={88} className="rounded-2xl" unoptimized />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-white font-bold text-2xl">{ghUser.name || username}</h1>
              {profile && <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full font-medium">on Stella</span>}
            </div>
            <p className="text-muted text-sm mb-2">@{username}</p>
            {ghUser.bio && <p className="text-white/70 text-sm mb-3">{ghUser.bio}</p>}
            <div className="flex gap-4 text-xs text-muted">
              <span><span className="text-white font-medium">{ghUser.followers}</span> followers</span>
              <span><span className="text-white font-medium">{ghUser.public_repos}</span> repos</span>
            </div>
          </div>
          <a href={ghUser.html_url} target="_blank" rel="noopener noreferrer"
            className="text-muted hover:text-white text-xs border border-border px-3 py-1.5 rounded-lg transition-colors shrink-0">
            GitHub ↗
          </a>
        </div>

        <h2 className="text-white font-semibold mb-2">
          {profile ? "Showcased repos" : "Top repos"} ({repos.length})
        </h2>
        {!profile && (
          <p className="text-muted text-xs mb-4">This user hasn&apos;t joined Stella yet — showing their public repos.</p>
        )}
        <div className="space-y-3">
          {repos.map((repo) => (
            <a key={repo.id as number} href={repo.html_url as string} target="_blank" rel="noopener noreferrer"
              className="block bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm mb-1">{repo.name as string}</p>
                  {(repo.description as string) && <p className="text-muted text-xs line-clamp-2">{repo.description as string}</p>}
                </div>
                <div className="flex gap-3 text-xs text-muted shrink-0">
                  {(repo.language as string) && <span>{repo.language as string}</span>}
                  <span>★ {((repo.stargazers_count as number) || 0).toLocaleString()}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
