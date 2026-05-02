"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type GHUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
};

type Repo = {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
};

type SearchResult = {
  github_user: GHUser;
  repos: Repo[];
  has_stella_profile: boolean;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/github-user/${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "User not found");
      } else {
        setResult(await res.json());
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-dvh flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav className="shrink-0 border-b border-border bg-background/90 backdrop-blur-sm z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M32 6L39 23L57 24L43 35L47 53L32 43L17 53L21 35L7 24L25 23Z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">Stella</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
      <main className="max-w-2xl mx-auto px-4 pt-10 pb-28">
        <h1 className="text-2xl font-bold text-foreground mb-2">Search GitHub users</h1>
        <p className="text-muted text-sm mb-8">Find any GitHub account and explore their repos</p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter a GitHub username..."
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted text-sm focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {result && (
          <div>
            <div className="bg-surface border border-border rounded-2xl p-6 mb-8 flex gap-5 items-start">
              <Image
                src={result.github_user.avatar_url}
                alt={result.github_user.login}
                width={72}
                height={72}
                className="rounded-2xl"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-foreground font-bold text-xl">{result.github_user.name || result.github_user.login}</h2>
                  {result.has_stella_profile && (
                    <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full font-medium">Stella</span>
                  )}
                </div>
                <p className="text-muted text-sm mb-2">@{result.github_user.login}</p>
                {result.github_user.bio && <p className="text-foreground/70 text-sm mb-3">{result.github_user.bio}</p>}
                <div className="flex gap-4 text-xs text-muted">
                  <span><span className="text-foreground font-medium">{result.github_user.followers}</span> followers</span>
                  <span><span className="text-foreground font-medium">{result.github_user.public_repos}</span> repos</span>
                </div>
              </div>
              <a href={result.github_user.html_url} target="_blank" rel="noopener noreferrer"
                className="text-muted hover:text-foreground text-xs border border-border px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0">
                GitHub ↗
              </a>
            </div>

            <div>
              <h3 className="text-foreground font-semibold mb-4">
                {result.has_stella_profile ? "Showcased repos" : "Public repos"} ({result.repos.length})
              </h3>
              <div className="space-y-3">
                {result.repos.map(repo => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium text-sm mb-1">{repo.name}</p>
                        {repo.description && <p className="text-muted text-xs line-clamp-2">{repo.description}</p>}
                      </div>
                      <div className="flex gap-3 text-xs text-muted shrink-0">
                        {repo.language && <span>{repo.language}</span>}
                        <span>★ {repo.stargazers_count.toLocaleString()}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
