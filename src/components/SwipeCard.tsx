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

export default function SwipeCard({ repo, onSwipe, index }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const rightOpacity = useTransform(x, [20, 100], [0, 1]);
  const leftOpacity = useTransform(x, [-100, -20], [1, 0]);
  const skipOpacity = useTransform(leftOpacity, (v: number) => 1 - v);
  const controls = useAnimation();
  const isTop = index === 0;

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
      dragElastic={0.8}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : (index * 3 - 3),
        position: "absolute",
        zIndex: 10 - index,
        top: `${index * 8}px`,
        width: "100%",
        height: "100%",
      }}
      animate={controls}
      onDragEnd={handleDragEnd}
      className={isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}
      whileDrag={{ scale: 1.02 }}
    >
      {isTop && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl border-[3px] border-green-500 flex items-start justify-start p-5 pointer-events-none z-20"
            style={{ opacity: rightOpacity }}
          >
            <span className="text-green-500 font-black text-2xl border-[3px] border-green-500 rounded-xl px-3 py-1 -rotate-12 bg-background/80">
              STAR ✓
            </span>
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-2xl border-[3px] border-red-500 flex items-start justify-end p-5 pointer-events-none z-20"
            style={{ opacity: skipOpacity }}
          >
            <span className="text-red-500 font-black text-2xl border-[3px] border-red-500 rounded-xl px-3 py-1 rotate-12 bg-background/80">
              SKIP ✗
            </span>
          </motion.div>
        </>
      )}

      <div
        className="bg-surface border border-border rounded-2xl p-6 select-none h-full flex flex-col"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-10 h-10 rounded-full border border-border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-muted text-xs truncate">{repo.owner.login}</p>
            <h2 className="text-foreground font-bold text-xl leading-tight truncate">{repo.name}</h2>
          </div>
          {repo.language && (
            <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-accent/20">
              {repo.language}
            </span>
          )}
        </div>

        <p className="text-foreground/70 text-sm leading-relaxed mb-4 flex-1 overflow-y-auto">
          {repo.description || "No description available."}
        </p>

        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {repo.topics.slice(0, 6).map(t => (
              <span key={t} className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-md text-xs">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 text-muted text-sm pt-3 border-t border-border mt-auto">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {repo.stargazers_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21a1 1 0 01-.707-.293l-4-4a1 1 0 011.414-1.414L11 14.586V10a1 1 0 012 0v4.586l2.293-2.293a1 1 0 011.414 1.414l-4 4A1 1 0 0112 21zm-3-15a2 2 0 110-4 2 2 0 010 4zm6 0a2 2 0 110-4 2 2 0 010 4z"/>
            </svg>
            {repo.forks_count.toLocaleString()} forks
          </span>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto text-accent hover:text-accent-hover text-xs transition-colors"
          >
            View on GitHub →
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
