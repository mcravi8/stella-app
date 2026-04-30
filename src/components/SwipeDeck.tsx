"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import SwipeCard, { type Repo } from "./SwipeCard";

interface SwipeDeckProps {
  repos: Repo[];
  onLoadMore: () => void;
  providerToken: string | null;
}

export default function SwipeDeck({ repos, onLoadMore, providerToken }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActionLoading, setIsActionLoading] = useState(false);
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
      <div className="flex flex-col items-center justify-center flex-1 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-foreground font-semibold text-xl mb-2">You&apos;re all caught up!</p>
        <p className="text-muted text-sm">Check back later for more repos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="relative flex-1 min-h-0">
        {visibleRepos.map((repo, i) => {
          const stackIndex = visibleRepos.length - 1 - i;
          return (
            <SwipeCard
              key={repo.id}
              repo={repo}
              onSwipe={handleSwipe}
              index={stackIndex}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-8 pb-2 shrink-0">
        <button
          onClick={() => handleSwipe("left")}
          disabled={isActionLoading}
          className="w-14 h-14 bg-surface rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 hover:scale-110 transition-all duration-200 text-2xl border border-border disabled:opacity-50"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
          title="Skip"
        >
          ✗
        </button>
        <button
          onClick={() => handleSwipe("right")}
          disabled={isActionLoading}
          className="w-14 h-14 bg-surface rounded-full flex items-center justify-center text-green-500 hover:bg-green-500/10 hover:scale-110 transition-all duration-200 text-2xl border border-border disabled:opacity-50"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
          title="Star & Fork"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
