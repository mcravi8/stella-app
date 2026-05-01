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
  needsStarsImport?: boolean;
}

const CONTRIBUTE_PROMPT_KEY = "stella_contribute_dismissed_at";
const CONTRIBUTE_PROMPT_AFTER_SWIPES = 20;
const CONTRIBUTE_PROMPT_COOLDOWN_DAYS = 7;

export default function SwipePageClient({ providerToken, userName, needsStarsImport }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [importToast, setImportToast] = useState<string | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [contributeDismissed, setContributeDismissed] = useState(true); // assume true until we read storage
  const router = useRouter();
  const supabase = createClient();

  // On mount: check localStorage for a recent dismissal. If older than the cooldown, treat as "show again".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stamp = window.localStorage.getItem(CONTRIBUTE_PROMPT_KEY);
    const dismissedRecently =
      stamp && Date.now() - parseInt(stamp, 10) < CONTRIBUTE_PROMPT_COOLDOWN_DAYS * 86_400_000;
    setContributeDismissed(Boolean(dismissedRecently));
  }, []);

  const showContributePrompt =
    swipeCount >= CONTRIBUTE_PROMPT_AFTER_SWIPES && !contributeDismissed && !submitOpen;

  const dismissContributePrompt = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONTRIBUTE_PROMPT_KEY, String(Date.now()));
    }
    setContributeDismissed(true);
  };

  const openSubmitFromPrompt = () => {
    setSubmitOpen(true);
    dismissContributePrompt();
  };

  const loadRepos = useCallback(async (pageNum: number, replace = false) => {
    try {
      const res = await fetch(`/api/repos?page=${pageNum}`);
      const data = await res.json();
      if (data.repos?.length) {
        setRepos(prev => {
          if (replace) return data.repos;
          const existing = new Set(prev.map((r: Repo) => r.id));
          const fresh = data.repos.filter((r: Repo) => !existing.has(r.id));
          return [...prev, ...fresh];
        });
        setPage(pageNum + 1);
      } else if (replace) {
        setRepos([]);
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

  // Backfill the user's pre-existing GitHub stars into Stella the first time
  // they hit the feed. Runs once per user (the API short-circuits if already done).
  // After it resolves, re-fetch page 1 so any stars now in the swipes table are
  // filtered out of the feed instead of appearing as suggestions.
  useEffect(() => {
    if (!needsStarsImport) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/import-stars", {
          method: "POST",
          headers: providerToken
            ? { "Content-Type": "application/json", "x-provider-token": providerToken }
            : undefined,
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.imported && data.imported > 0) {
          setImportToast(`Imported ${data.imported} starred repo${data.imported === 1 ? "" : "s"} from GitHub`);
          setTimeout(() => setImportToast(null), 4000);
          // Re-fetch from page 1, replacing the deck, so dedupe applies immediately.
          setPage(1);
          await loadRepos(1, true);
        }
      } catch (e) {
        console.error("[stars-import] failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [needsStarsImport, loadRepos]);

  const handleLoadMore = useCallback(() => {
    loadRepos(page);
  }, [loadRepos, page]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className="h-dvh flex flex-col bg-background relative overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
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

      <main className="flex-1 min-h-0 max-w-sm w-full mx-auto px-4 pt-4 pb-24 flex flex-col">
        {loading ? <DeckSkeleton /> : (
          <SwipeDeck
            repos={repos}
            onLoadMore={handleLoadMore}
            providerToken={providerToken}
            onSwiped={() => setSwipeCount(c => c + 1)}
          />
        )}
      </main>

      <SubmitRepoModal isOpen={submitOpen} onClose={() => setSubmitOpen(false)} />

      {importToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground shadow-lg flex items-center gap-2"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
        >
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {importToast}
        </div>
      )}

      {showContributePrompt && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm bg-surface border border-border rounded-2xl px-4 py-3 shadow-xl motion-safe:animate-[fadeIn_300ms_ease-out]"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
          role="region"
          aria-label="Contribute prompt"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l1.7 5.3 5.3 1.7-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm leading-tight">Know a repo Stella doesn&apos;t have?</p>
              <p className="text-muted text-xs leading-snug mt-0.5">Add it for the community — others will discover it too.</p>
            </div>
            <button
              onClick={dismissContributePrompt}
              className="text-muted hover:text-foreground -mr-1 -mt-1 p-1.5 rounded-lg hover:bg-background/60 transition-colors shrink-0"
              aria-label="Dismiss"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <button
            onClick={openSubmitFromPrompt}
            className="mt-3 w-full px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            Submit a repo
          </button>
        </div>
      )}
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
