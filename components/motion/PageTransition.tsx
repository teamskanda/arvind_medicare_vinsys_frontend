"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Route-change entrance for the dashboard.
 *
 * Keyed on the pathname, so navigating between pages replays the entrance
 * instead of snapping. There is deliberately no exit animation: Next's app
 * router swaps the tree on navigation, and holding the old page on screen
 * to animate it out makes every click feel slower than it is. A short
 * entrance on the new content covers the transition without adding latency.
 *
 * The movement is small (8px) and quick. This runs on every navigation a
 * customer makes all day; anything more theatrical would wear thin fast.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
