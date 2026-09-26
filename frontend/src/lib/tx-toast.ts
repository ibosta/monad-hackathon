import { toast } from "sonner";
import { explainError, type TxResult } from "@/hooks/use-moningo";
import { MONAD_EXPLORER } from "@/lib/wagmi";

/** Wraps a Monad tx in loading → success(with confirm time) / error toasts. */
export async function withTxToast(label: string, run: () => Promise<TxResult>): Promise<TxResult> {
  const id = toast.loading(`${label}…`, { description: "Confirm in your wallet" });
  try {
    const tx = await run();
    toast.success(`${label} ✓`, {
      id,
      description: `Confirmed on Monad in ${(tx.ms / 1000).toFixed(2)}s`,
      action: {
        label: "View",
        onClick: () => window.open(`${MONAD_EXPLORER}/tx/${tx.hash}`, "_blank"),
      },
      duration: 5000,
    });
    return tx;
  } catch (e) {
    toast.error(`${label} failed`, { id, description: explainError(e) });
    throw e;
  }
}
