"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import SwipeCard, { type Repo } from "./SwipeCard";

interface SwipeDeckProps {
  repos: Repo[];
  onLoadMore: () => void;
  providerToken: string | null;
  onSwiped?: (direction: "left" | "right") => void;
}

interface Enhancement {
  description: string;
  highlights: string[];
}

type EnhanceState = "loading" | "done" | "failed";

const PREFETCH_AHEAD = 5;

export default function SwipeDeck({ repos, onLoadMore, providerToken, onSwiped }: SwipeDeckProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [enhancements, setEnhancements] = useState<Record<string, Enhancement>>({});
  const [enhanceStates, setEnhanceStates] = useState<Record<string, EnhanceState>>({});
  const enhanceRequested = useRef<Set<string>>(new Set());
  const loadMoreCalled = useRef(false);

  const currentRepo = repos[currentIndex];
  const visibleRepos = repos.slice(currentIndex, currentIndex + 3).reverse();

  useEffect(() => {
    if (!loadMoreCalled.current && repos.length - currentIndex <= 5) {
      loadMoreCalled.current = true;
      onLoadMore();
      setTimeout(() => { loadMoreCalled.current = false; }, 2000);
    }
  }, [currentIndex, repos.length, onLoadMore]);

  // Lazy enhancement: prefetch enhanced descriptions for the next PREFETCH_AHEAD cards.
  // By the time most cards become visible they're already enhanced; the small "Enhancing…"
  // pill on the visible card only shows for the rare cache-miss-on-current-card case.
  useEffect(() => {
    const targets = repos.slice(currentIndex, currentIndex + PREFETCH_AHEAD);
    targets.forEach(r => {
      if (enhanceRequested.current.has(r.full_name)) return;
      enhanceRequested.current.add(r.full_name);
      setEnhanceStates(prev => ({ ...prev, [r.full_name]: "loading" }));
      fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: r.full_name,
          github_description: r.description,
          topics: r.topics,
          language: r.language,
        }),
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.description) {
            setEnhancements(prev => ({
              ...prev,
              [r.full_name]: { description: data.description, highlights: data.highlights || [] },
            }));
            setEnhanceStates(prev => ({ ...prev, [r.full_name]: "done" }));
          } else {
            setEnhanceStates(prev => ({ ...prev, [r.full_name]: "failed" }));
          }
        })
        .catch(() => {
          setEnhanceStates(prev => ({ ...prev, [r.full_name]: "failed" }));
        });
    });
  }, [currentIndex, repos]);

  // One-step undo. Tracks the most recent swipe so the user can press "Undo"
  // within ~6 seconds to bring the card back. Replaced on each new swipe;
  // cleared on timeout. Single-step only — we don't keep a stack.
  const [lastSwipe, setLastSwipe] = useState<{ repo: Repo; direction: "left" | "right" } | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (!lastSwipe) return;
    const t = setTimeout(() => setLastSwipe(null), 6000);
    return () => clearTimeout(t);
  }, [lastSwipe]);

  const handleSwipe = useCallback(async (direction: "left" | "right") => {
    if (!currentRepo || isActionLoading) return;
    setIsActionLoading(true);
    const swiped = currentRepo;
    try {
      await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: swiped.full_name,
          direction,
          repo_data: swiped,
          provider_token: providerToken,
        }),
      });
    } catch (e) {
      console.error("Failed to record swipe:", e);
    } finally {
      setIsActionLoading(false);
      setCurrentIndex(prev => prev + 1);
      setLastSwipe({ repo: swiped, direction });
      onSwiped?.(direction);
      // Invalidate the client-side Router Cache so /my-repos refetches the
      // fresh swipes list when the user navigates there. Without this the
      // bottom-nav prefetch serves a stale RSC payload from before the swipe.
      router.refresh();
    }
  }, [currentRepo, isActionLoading, providerToken, onSwiped, router]);

  const handleUndo = useCallback(async () => {
    if (!lastSwipe || undoing) return;
    setUndoing(true);
    try {
      await fetch("/api/swipe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: lastSwipe.repo.full_name,
          provider_token: providerToken,
        }),
      });
      setCurrentIndex(prev => Math.max(0, prev - 1));
      setLastSwipe(null);
      router.refresh();
    } catch (e) {
      console.error("Failed to undo swipe:", e);
    } finally {
      setUndoing(false);
    }
  }, [lastSwipe, undoing, providerToken, router]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleSwipe("right");
      if (e.key === "ArrowLeft") handleSwipe("left");
      if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSwipe, handleUndo]);

  if (!currentRepo) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <p className="text-foreground font-semibold text-xl mb-1.5">You&apos;re all caught up</p>
        <p className="text-muted text-sm">Check back later for more repos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="relative flex-1 min-h-0">
        {visibleRepos.map((repo, i) => {
          const stackIndex = visibleRepos.length - 1 - i;
          const enhanced = enhancements[repo.full_name];
          const merged = enhanced
            ? { ...repo, description: enhanced.description, highlights: enhanced.highlights }
            : repo;
          // Only surface the "Enhancing…" indicator on the top card — stack cards behind
          // would just be visual noise. State is "loading" until the enhance call resolves.
          const enhancing =
            stackIndex === 0 && !enhanced && enhanceStates[repo.full_name] === "loading";
          return (
            <SwipeCard
              key={repo.id}
              repo={merged}
              onSwipe={handleSwipe}
              index={stackIndex}
              enhancing={enhancing}
            />
          );
        })}
      </div>

      {/* One-step undo button. Slides up below the deck for ~6s after each swipe.
          Disappears after timeout, on next swipe (replaced), or when used.
          Pinned to viewport so it sits in the gap between card bottom and the
          floating bottom-nav island, never overlapping the card's GitHub link. */}
      {lastSwipe && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 motion-safe:animate-[fadeIn_180ms_ease-out]"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
        >
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="inline-flex items-center gap-2 bg-foreground text-background hover:opacity-90 active:opacity-80 transition-opacity rounded-full px-4 py-2 text-sm font-medium shadow-lg disabled:opacity-50"
            style={{ boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}
          >
            {undoing ? (
              <>
                <svg className="w-4 h-4 motion-safe:animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Undoing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4M5 10h11a4 4 0 014 4v3" />
                </svg>
                Undo {lastSwipe.direction === "right" ? "star" : "skip"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
