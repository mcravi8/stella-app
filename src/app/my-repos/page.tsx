import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

interface RepoData {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  owner: { avatar_url: string; login: string };
}

export default async function MyReposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [swipesResult, contributionsResult] = await Promise.all([
    supabase
      .from("swipes")
      .select("*")
      .eq("user_id", user.id)
      .eq("direction", "right")
      .order("created_at", { ascending: false }),
    supabase
      .from("submitted_repos")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", user.id),
  ]);

  const swipes = swipesResult.data;
  const contributionCount = contributionsResult.count || 0;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-sm z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-muted hover:text-foreground transition-colors text-sm">← Back</Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-4 h-4" fill="none">
                <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">My Repos</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {contributionCount > 0 && (
              <span className="text-accent text-sm font-medium">
                ✦ {contributionCount} contributed
              </span>
            )}
            <span className="text-muted text-sm">{swipes?.length || 0} saved</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-8 pb-28">
        {!swipes?.length ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-foreground font-semibold text-xl mb-2">No repos saved yet</p>
            <p className="text-muted text-sm mb-6">Swipe right to fork &amp; save repos you love</p>
            <Link href="/" className="bg-accent hover:bg-[#8B5CF6] text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
              Discover repos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {swipes.map((swipe) => {
              const repo = swipe.repo_data as RepoData;
              if (!repo) return null;
              return (
                <a
                  key={swipe.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface rounded-2xl p-5 hover:bg-border transition-all duration-200 group border border-border/50 hover:border-accent/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {repo.owner?.avatar_url && (
                      <img src={repo.owner.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    )}
                    <span className="text-muted text-xs truncate">{repo.owner?.login}</span>
                    {repo.language && (
                      <span className="ml-auto bg-accent/20 text-accent px-2 py-0.5 rounded-full text-xs shrink-0">{repo.language}</span>
                    )}
                  </div>
                  <h3 className="text-foreground font-semibold mb-2 group-hover:text-accent transition-colors truncate">{repo.name}</h3>
                  <p className="text-muted text-xs line-clamp-2 mb-3 leading-relaxed">{repo.description || "No description"}</p>
                  <div className="flex items-center gap-3 text-muted text-xs">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {repo.stargazers_count?.toLocaleString()}
                    </span>
                    <span>{repo.forks_count?.toLocaleString()} forks</span>
                    <span className="ml-auto text-accent text-xs group-hover:underline">View →</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
