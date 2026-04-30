"use client";
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
}

interface SwipeCardProps {
  repo: Repo;
  onSwipe: (direction: "left" | "right") => void;
  index: number;
}

const CARD_SHADOW =
  "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.10)";

export default function SwipeCard({ repo, onSwipe, index }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const starOpacity = useTransform(x, [30, 110], [0, 1]);
  const skipOpacity = useTransform(x, [-110, -30], [1, 0]);
  const controls = useAnimation();
  const isTop = index === 0;

  const stackScale = 1 - index * 0.04;
  const stackOffset = index * 10;

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

        <p
          className="text-foreground/75 text-sm leading-relaxed mb-4 flex-1"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 7,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {repo.description || "No description available."}
        </p>

        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {repo.topics.slice(0, 5).map(t => (
              <span key={t} className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-md text-xs">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-muted text-sm pt-3 border-t border-border mt-auto">
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
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="ml-auto inline-flex items-center gap-1 text-accent hover:text-accent-hover text-xs font-medium transition-colors"
          >
            View
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-9 9M5 12v7h7" />
            </svg>
          </a>
        </div>

        {repo.contributed_by && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
            <span className="text-accent/70 text-xs">✦</span>
            <span className="text-muted text-xs">
              Contributed by{" "}
              <span className="text-accent font-medium">@{repo.contributed_by}</span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
