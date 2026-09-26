"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useAppConfig } from "@/hooks/use-moningo";

/**
 * - Unregisters stale service workers left on this origin by other local apps (Moningo ships none);
 *   they intercept every fetch and break API calls.
 * - Shows a banner while the backend API is unreachable.
 */
export function AppHealth() {
  const { isError } = useAppConfig();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (!regs.length) return;
      Promise.all(regs.map((r) => r.unregister())).then(() => {
        if (navigator.serviceWorker.controller) window.location.reload();
      });
    });
  }, []);

  return (
    <AnimatePresence>
      {isError && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="sticky top-16 z-30 flex items-center justify-center gap-2 bg-duo-red/90 px-4 py-2 text-sm font-bold text-white"
        >
          <WifiOff className="h-4 w-4" /> Can&apos;t reach the Moningo API. Retrying…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
