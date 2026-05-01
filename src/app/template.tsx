"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Next.js App Router runs `template.tsx` once per navigation (unlike layouts,
 * which persist), so it's the natural place to attach a per-page entrance animation.
 *
 * Slide-in horizontally based on bottom-nav tab order so left → right tabs feel
 * like flipping through pages in the same direction. Falls back to a subtle
 * cross-fade for non-tab routes (login, settings, etc.).
 */

const TAB_ORDER = ["/", "/search", "/my-repos", "/profile", "/settings"];

function tabIndex(pathname: string): number {
  for (let i = TAB_ORDER.length - 1; i >= 0; i--) {
    const t = TAB_ORDER[i];
    if (pathname === t || pathname.startsWith(t + "/")) return i;
  }
  return -1;
}

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  // Track the previous pathname so we know which direction to slide from.
  const prevRef = useRef<string>(pathname);
  const previous = prevRef.current;
  useEffect(() => {
    prevRef.current = pathname;
  }, [pathname]);

  const fromIdx = tabIndex(previous);
  const toIdx = tabIndex(pathname);
  // If both pages are recognised tabs, slide left or right based on direction.
  // Otherwise (e.g. login → home, /onboarding → /) just fade.
  const direction =
    fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx ? (toIdx > fromIdx ? 1 : -1) : 0;
  const initialX = direction === 0 ? 0 : direction * 24;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, x: initialX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
