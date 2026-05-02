import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

// Always render fresh — bio + showcased-repo selection update from /settings,
// and we don't want the prefetched RSC payload to lag behind the most recent save.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <div
      className="h-dvh flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav className="shrink-0 border-b border-border bg-background/90 backdrop-blur-sm z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M32 6L39 23L57 24L43 35L47 53L32 43L17 53L21 35L7 24L25 23Z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">Stella</span>
          </Link>
          {isOwn && (
            <Link href="/settings" className="text-muted hover:text-accent text-sm transition-colors">Edit profile</Link>
          )}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
      <main className="max-w-2xl mx-auto px-4 pt-10 pb-28">
        <div className="mb-10">
          {/* Header row: avatar + identity. The GitHub link moves under the bio
              so it doesn't squeeze the name into an ugly wrap. */}
          <div className="flex items-start gap-4 mb-3">
            <Image
              src={ghUser.avatar_url}
              alt={username}
              width={80}
              height={80}
              className="rounded-2xl shrink-0"
              unoptimized
            />
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-foreground font-bold text-2xl leading-tight break-words">
                {ghUser.name || username}
              </h1>
              <p className="text-muted text-sm mt-0.5">@{username}</p>
              {profile && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full font-medium">
                  on Stella
                </span>
              )}
            </div>
          </div>

          {(profile?.bio || ghUser.bio) && (
            <p className="text-foreground/80 text-sm mb-4 whitespace-pre-wrap leading-relaxed">
              {profile?.bio || ghUser.bio}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted mb-4">
            <span>
              <span className="text-foreground font-semibold">{ghUser.followers}</span> followers
            </span>
            <span>
              <span className="text-foreground font-semibold">{ghUser.public_repos}</span> repos
            </span>
          </div>

          <a
            href={ghUser.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted hover:text-foreground text-sm border border-border px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.32c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.65 7.65 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.21c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View on GitHub
          </a>
        </div>

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
    </div>
  );
}
