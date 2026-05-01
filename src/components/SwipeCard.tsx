"use client";
import { useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";

export interface Repo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  owner: { avatar_url: string; login: string };
  contributed_by?: string | null;
  source_label?: string | null;
  source_url?: string | null;
  highlights?: string[];
}

interface SwipeCardProps {
  repo: Repo;
  onSwipe: (direction: "left" | "right") => void;
  index: number;
  enhancing?: boolean;
}

const CARD_SHADOW =
  "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.10)";

type ReadmeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; text: string; truncated: boolean }
  | { kind: "missing" }
  | { kind: "error" };

export default function SwipeCard({ repo, onSwipe, index, enhancing }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const starOpacity = useTransform(x, [30, 110], [0, 1]);
  const skipOpacity = useTransform(x, [-110, -30], [1, 0]);
  const controls = useAnimation();
  const isTop = index === 0;

  const stackScale = 1 - index * 0.04;
  const stackOffset = index * 10;

  // Tap-on-description toggles the card body between Stella's synthesized
  // description and the actual GitHub README.
  const [showReadme, setShowReadme] = useState(false);
  const [readmeState, setReadmeState] = useState<ReadmeState>({ kind: "idle" });

  const toggleReadme = useCallback(async () => {
    // Already showing README → flip back
    if (showReadme) {
      setShowReadme(false);
      return;
    }
    setShowReadme(true);
    if (readmeState.kind === "loaded" || readmeState.kind === "loading") return;

    setReadmeState({ kind: "loading" });
    try {
      const res = await fetch(`/api/readme?full_name=${encodeURIComponent(repo.full_name)}`);
      const data = await res.json();
      if (data.missing) {
        setReadmeState({ kind: "missing" });
      } else if (typeof data.readme === "string" && data.readme.length > 0) {
        setReadmeState({ kind: "loaded", text: data.readme, truncated: !!data.truncated });
      } else if (data.error) {
        setReadmeState({ kind: "error" });
      } else {
        setReadmeState({ kind: "missing" });
      }
    } catch {
      setReadmeState({ kind: "error" });
    }
  }, [repo.full_name, showReadme, readmeState.kind]);

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.3, ease: "easeOut" } });
      onSwipe("right");
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.3, ease: "easeOut" } });
      onSwipe("left");
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: isTop ? 1 : stackScale,
        position: "absolute",
        zIndex: 10 - index,
        top: stackOffset,
        width: "100%",
        height: "100%",
        transformOrigin: "top center",
      }}
      animate={controls}
      onDragEnd={handleDragEnd}
      className={isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}
      whileDrag={{ scale: 1.015 }}
    >
      {isTop && (
        <>
          <motion.div
            className="absolute top-5 left-5 pointer-events-none z-20"
            style={{ opacity: starOpacity }}
          >
            <span className="inline-flex items-center gap-1.5 text-green-500 font-bold text-lg border-[2.5px] border-green-500 rounded-lg px-3 py-1 -rotate-[8deg] bg-background/85 backdrop-blur-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              STAR
            </span>
          </motion.div>
          <motion.div
            className="absolute top-5 right-5 pointer-events-none z-20"
            style={{ opacity: skipOpacity }}
          >
            <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-lg border-[2.5px] border-red-500 rounded-lg px-3 py-1 rotate-[8deg] bg-background/85 backdrop-blur-sm">
              SKIP
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
          </motion.div>
        </>
      )}

      <div
        className="bg-surface border border-border rounded-2xl p-6 select-none h-full flex flex-col overflow-hidden"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center gap-3 mb-4">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-12 h-12 rounded-full border border-border shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-muted text-xs truncate">{repo.owner.login}</p>
            <h2 className="text-foreground font-bold text-xl leading-tight truncate">{repo.name}</h2>
          </div>
          {repo.language && (
            <span className="bg-accent/10 text-accent px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-accent/20">
              {repo.language}
            </span>
          )}
        </div>

        {/* Tap to toggle between Stella's synthesized description and the GitHub README. */}
        {!showReadme ? (
          <div
            className="flex-1 min-h-0 flex flex-col cursor-pointer"
            onClick={toggleReadme}
            role="button"
            aria-label="Show README"
          >
            <p
              key={`desc-${repo.description}`}
              className="text-foreground/75 text-sm leading-relaxed mb-3 motion-safe:animate-[fadeIn_220ms_ease-out]"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: repo.highlights?.length ? 4 : 7,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {repo.description || "No description available."}
            </p>

            {repo.highlights && repo.highlights.length > 0 && (
              <ul className="space-y-1.5 mb-3 overflow-hidden motion-safe:animate-[fadeIn_280ms_ease-out]">
                {repo.highlights.slice(0, 3).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground/80 text-sm leading-snug">
                    <span className="text-accent mt-1 shrink-0">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {enhancing && !repo.highlights?.length && (
              <div className="flex items-start mb-2">
                <div className="inline-flex items-center gap-1.5 text-accent text-xs font-medium bg-accent/10 border border-accent/20 rounded-full px-2.5 py-1">
                  <svg className="w-3 h-3 motion-safe:animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Enhancing description…
                </div>
              </div>
            )}

            <p className="text-muted text-[11px] mb-2 italic">Tap for the full README</p>

            {repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {repo.topics.slice(0, 5).map(t => (
                  <span key={t} className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-md text-xs">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1" />
          </div>
        ) : (
          <div
            className="flex-1 min-h-0 flex flex-col cursor-pointer motion-safe:animate-[fadeIn_220ms_ease-out]"
            onClick={toggleReadme}
            role="button"
            aria-label="Back to summary"
          >
            <div
              className="flex-1 min-h-0 overflow-y-auto pr-1 text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap"
              onPointerDown={e => e.stopPropagation()}
              onWheelCapture={e => e.stopPropagation()}
            >
              {readmeState.kind === "loading" && (
                <div className="flex items-center gap-2 text-muted text-xs">
                  <svg className="w-3.5 h-3.5 motion-safe:animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Loading README…
                </div>
              )}
              {readmeState.kind === "loaded" && (
                <>
                  {readmeState.text}
                  {readmeState.truncated && (
                    <span className="block mt-3 text-muted text-xs italic">
                      Truncated — open on GitHub for the full README.
                    </span>
                  )}
                </>
              )}
              {readmeState.kind === "missing" && (
                <span className="text-muted">This repo doesn&apos;t have a README.</span>
              )}
              {readmeState.kind === "error" && (
                <span className="text-red-500">Couldn&apos;t load the README. Tap again to retry.</span>
              )}
            </div>
            <p className="text-muted text-[11px] mt-2 italic shrink-0">Tap to go back to the summary</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-muted text-sm pt-3 border-t border-border">
          <span className="flex items-center gap-1.5" title="Stars">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="tabular-nums">{repo.stargazers_count.toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1.5" title="Forks">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="12" cy="18" r="2" />
              <path strokeLinecap="round" d="M6 8v2a2 2 0 002 2h8a2 2 0 002-2V8M12 14v2" />
            </svg>
            <span className="tabular-nums">{repo.forks_count.toLocaleString()}</span>
          </span>
        </div>

        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          className="mt-3 inline-flex items-center justify-center gap-1.5 w-full bg-foreground text-background hover:opacity-90 active:opacity-80 transition-opacity rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.32c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.65 7.65 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.21c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Open on GitHub
        </a>

        {repo.contributed_by && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
            <span className="text-accent/70 text-xs">✦</span>
            <span className="text-muted text-xs">
              Contributed by{" "}
              <span className="text-accent font-medium">@{repo.contributed_by}</span>
            </span>
          </div>
        )}

        {!repo.contributed_by && repo.source_label && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
            <span className="text-accent/70 text-xs">✦</span>
            {repo.source_url ? (
              <a
                href={repo.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                className="text-muted hover:text-accent text-xs transition-colors"
              >
                {repo.source_label}
              </a>
            ) : (
              <span className="text-muted text-xs">{repo.source_label}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
