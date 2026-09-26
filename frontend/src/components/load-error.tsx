"use client";

import { RefreshCw } from "lucide-react";
import { Mascot } from "@/components/mascot";

/** Friendly error card with a retry button (instead of an endless spinner). */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <section className="metal-card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <Mascot size={100} mood="sad" />
      <h2 className="text-xl font-black text-white">Couldn&apos;t load {what}</h2>
      <p className="text-sm text-monad-200">
        The Moningo API or the Monad RPC didn&apos;t answer. Try again in a moment.
      </p>
      <button onClick={onRetry} className="btn-monad">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </section>
  );
}
