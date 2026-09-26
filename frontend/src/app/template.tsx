"use client";

import { motion } from "framer-motion";

/**
 * Re-mounts on every navigation → smooth page transition.
 * Opacity only: transform/filter on an ancestor would re-anchor `position: fixed` children.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
