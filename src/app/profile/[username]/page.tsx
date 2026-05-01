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
      .select("repo_data, position")
      .eq("user_id", profile.user_id)
      .order("position", { ascending: true });
    // Only show repos owned by this user — guards against legacy showcased
    // entries that referenced repos starred from another author.
    repos = (showcased || [])
      .map(r => r.repo_data)
      .filter(Boolean)
      .filter((r: Record<string, unknown>) => {
        const owner = (r.owner as { login?: string } | undefined)?.login;
        return typeof owner === "string" && owner.toLowerCase() === username.toLowerCase();
      });
  }
  if (!repos.length) {
    // Default fallback: their own (non-fork) public repos, top-starred first.
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=stars&per_page=30&type=owner`,
      { headers: { "User-Agent": "Stella-App/1.0" }, next: { revalidate: 300 } }
    );
    if (reposRes.ok) {
      const all = (await reposRes.json()) as Record<string, unknown>[];
      repos = all.filter(r => !(r as { fork?: boolean }).fork).slice(0, 20);
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = user?.user_metadata?.user_name === username;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur-md z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">Stella</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-28">
        {/* Hero-style centered profile header — avatar / name / username / badge / bio
            stacked vertically and centered, then stats and actions below. Reads cleanly
            on a phone and matches the visual weight of native social apps. */}
        <section className="flex flex-col items-center text-center mb-8">
          <Image
            src={ghUser.avatar_url}
            alt={username}
            width={104}
            height={104}
            className="rounded-full ring-4 ring-background shadow-md"
            style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.10)" }}
            unoptimized
          />
          <h1 className="text-foreground font-bold text-2xl leading-tight mt-5 break-words">
            {ghUser.name || username}
          </h1>
          <p className="text-muted text-sm mt-1">@{username}</p>
          {profile && (
            <span className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 bg-accent/15 text-accent text-xs rounded-full font-medium border border-accent/25">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              on Stella
            </span>
          )}
          {(profile?.bio || ghUser.bio) && (
            <p className="text-foreground/80 text-sm mt-4 max-w-md whitespace-pre-wrap leading-relaxed">
              {profile?.bio || ghUser.bio}
            </p>
          )}

          {/* Stats row — pill-style, equal weight, easy to read */}
          <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-xs">
            <div className="bg-surface border border-border rounded-xl py-2.5">
              <div className="text-foreground font-bold text-lg leading-none">{ghUser.followers}</div>
              <div className="text-muted text-xs mt-1">Followers</div>
            </div>
            <div className="bg-surface border border-border rounded-xl py-2.5">
              <div className="text-foreground font-bold text-lg leading-none">{ghUser.public_repos}</div>
              <div className="text-muted text-xs mt-1">Repos</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <a
              href={ghUser.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-foreground bg-surface hover:bg-border border border-border px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.32c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.65 7.65 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.21c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            {isOwn && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 text-foreground bg-foreground/10 hover:bg-foreground/15 border border-foreground/15 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Edit profile
              </Link>
            )}
          </div>
        </section>

        <h2 className="text-foreground font-semibold mb-2">
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
                  <p className="text-foreground font-medium text-sm mb-1">{repo.name as string}</p>
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
