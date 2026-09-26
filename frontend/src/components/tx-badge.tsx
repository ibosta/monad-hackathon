import { Zap, ExternalLink } from "lucide-react";
import { MONAD_EXPLORER } from "@/lib/wagmi";
import type { TxResult } from "@/hooks/use-moningo";

/** Shows how fast Monad confirmed a transaction, with an explorer link. */
export function TxBadge({ tx, label }: { tx: TxResult; label: string }) {
  return (
    <a
      href={`${MONAD_EXPLORER}/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-monad/40 bg-monad/10 px-3 py-1.5 text-xs font-bold text-monad-200 transition-colors hover:bg-monad/20"
    >
      <Zap className="h-3.5 w-3.5 fill-monad text-monad" />
      {label} · confirmed on Monad in {(tx.ms / 1000).toFixed(2)}s
      <ExternalLink className="h-3 w-3 opacity-70" />
    </a>
  );
}
