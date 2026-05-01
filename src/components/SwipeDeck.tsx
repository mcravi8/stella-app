"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import SwipeCard, { type Repo } from "./SwipeCard";

interface SwipeDeckProps {
  repos: Repo[];
  onLoadMore: () => void;
  providerToken: string | null;
}

interface Enhancement {
  description: string;
  highlights: string[];
}

type EnhanceState = "loading" | "done" | "failed";

const PREFETCH_AHEAD = 5;

export default function SwipeDeck({ repos, onLoadMore, providerToken }: SwipeDeckProps) {
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

  const handleSwipe = useCallback(async (direction: "left" | "right") => {
    if (!currentRepo || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: currentRepo.full_name,
          direction,
          repo_data: currentRepo,
          provider_token: providerToken,
        }),
      });
    } catch (e) {
      console.error("Failed to record swipe:", e);
    } finally {
      setIsActionLoading(false);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentRepo, isActionLoading, providerToken]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleSwipe("right");
      if (e.key === "ArrowLeft") handleSwipe("left");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSwipe]);

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
    <div className="flex flex-col h-full">
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
    </div>
  );
}
