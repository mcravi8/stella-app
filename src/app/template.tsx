"use client";

import { motion } from "framer-motion";

/**
 * Next.js App Router runs `template.tsx` once per navigation, so it's the natural
 * place to attach a per-page entrance animation.
 *
 * Why opacity-only and not slide: any ancestor with a non-trivial CSS `transform`
 * (which Framer Motion applies for translateX) breaks `position: sticky` on
 * descendants. Sticky elements stop sticking — pages with sticky headers (search,
 * settings, profile, my-repos) lose the fixed top bar during and sometimes after
 * the animation. Opacity-only avoids the issue entirely while still feeling like
 * a transition rather than an instant snap.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
