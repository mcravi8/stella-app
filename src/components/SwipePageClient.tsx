"use client";
import { useState, useEffect, useCallback } from "react";
import SwipeDeck from "./SwipeDeck";
import SubmitRepoModal from "./SubmitRepoModal";
import type { Repo } from "./SwipeCard";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

interface Props {
  providerToken: string | null;
  userName: string;
}

export default function SwipePageClient({ providerToken, userName }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadRepos = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/repos?page=${pageNum}`);
      const data = await res.json();
      if (data.repos?.length) {
        setRepos(prev => {
          const existing = new Set(prev.map((r: Repo) => r.id));
          const fresh = data.repos.filter((r: Repo) => !existing.has(r.id));
          return [...prev, ...fresh];
        });
        setPage(pageNum + 1);
      }
    } catch (e) {
      console.error("Failed to load repos:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRepos(1);
  }, [loadRepos]);

  const handleLoadMore = useCallback(() => {
    loadRepos(page);
  }, [loadRepos, page]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="h-dvh flex flex-col bg-background">
      <nav className="border-b border-border bg-background/90 backdrop-blur-sm z-40 shrink-0">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">Stella</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubmitOpen(true)}
              className="text-muted hover:text-accent text-sm transition-colors font-medium px-2 py-1 rounded-lg hover:bg-surface"
            >
              + Submit
            </button>
            <Link href="/search" className="text-muted hover:text-accent text-sm transition-colors font-medium px-2 py-1 rounded-lg hover:bg-surface">
              Search
            </Link>
            <Link href="/my-repos" className="text-muted hover:text-accent text-sm transition-colors font-medium px-2 py-1 rounded-lg hover:bg-surface">
              Starred
            </Link>
            <Link href={`/profile/${userName}`} className="text-muted hover:text-accent text-sm transition-colors font-medium px-2 py-1 rounded-lg hover:bg-surface">
              Profile
            </Link>
            <ThemeToggle />
            <button onClick={handleLogout} className="text-muted hover:text-foreground text-sm transition-colors px-2 py-1 rounded-lg hover:bg-surface">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 min-h-0 max-w-sm w-full mx-auto px-4 py-4 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-sm">Loading repos...</p>
          </div>
        ) : (
          <SwipeDeck repos={repos} onLoadMore={handleLoadMore} providerToken={providerToken} />
        )}
      </main>

      <SubmitRepoModal isOpen={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}
