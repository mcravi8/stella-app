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
    <div className="h-dvh flex flex-col bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 60%)",
        }}
      />

      <nav className="border-b border-border bg-background/80 backdrop-blur-md z-40 shrink-0">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-foreground text-lg">Stella</span>
          </Link>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSubmitOpen(true)}
              className="text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-surface"
              title="Submit a repo"
              aria-label="Submit a repo"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <Link
              href="/search"
              className="text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-surface"
              title="Search"
              aria-label="Search"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
              </svg>
            </Link>
            <Link
              href="/my-repos"
              className="text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-surface"
              title="Starred repos"
              aria-label="Starred repos"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinejoin="round" d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8L6.7 19.7l1-6L3.3 9.4l6-.9L12 3z" />
              </svg>
            </Link>
            <Link
              href={`/profile/${userName}`}
              className="text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-surface"
              title="Profile"
              aria-label="Profile"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
            </Link>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-muted hover:text-foreground transition-colors p-2 rounded-lg hover:bg-surface"
              title="Sign out"
              aria-label="Sign out"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 min-h-0 max-w-sm w-full mx-auto px-4 py-4 flex flex-col">
        {loading ? <DeckSkeleton /> : (
          <SwipeDeck repos={repos} onLoadMore={handleLoadMore} providerToken={providerToken} />
        )}
      </main>

      <SubmitRepoModal isOpen={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="relative flex-1 min-h-0">
        <div
          className="absolute inset-0 bg-surface border border-border rounded-2xl p-6 flex flex-col"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-border/60" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-border/60" />
              <div className="h-4 w-40 rounded bg-border/60" />
            </div>
            <div className="h-6 w-16 rounded-full bg-border/60" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="h-3 w-full rounded bg-border/60" />
            <div className="h-3 w-11/12 rounded bg-border/60" />
            <div className="h-3 w-10/12 rounded bg-border/60" />
            <div className="h-3 w-9/12 rounded bg-border/60" />
          </div>
          <div className="flex gap-1.5 mb-4 mt-4">
            <div className="h-5 w-14 rounded-md bg-border/60" />
            <div className="h-5 w-20 rounded-md bg-border/60" />
            <div className="h-5 w-16 rounded-md bg-border/60" />
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <div className="h-3 w-12 rounded bg-border/60" />
            <div className="h-3 w-12 rounded bg-border/60" />
            <div className="h-3 w-14 rounded bg-border/60 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
