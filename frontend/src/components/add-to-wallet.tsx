"use client";

import { useState } from "react";
import { useWalletClient } from "wagmi";
import { toast } from "sonner";
import { Copy, Wallet } from "lucide-react";
import { Modal } from "@/components/modal";
import { walletErrorMessage } from "@/lib/wallet-errors";
import { cn } from "@/lib/utils";

/**
 * Tries MetaMask's (experimental) ERC-721 wallet_watchAsset. Wallets often refuse NFTs on custom
 * networks like Monad Testnet, so on failure we show copyable details for a manual "Import NFT".
 */
export function AddToWalletButton({
  contract,
  tokenId,
  className,
  compact,
}: {
  contract: string;
  tokenId: number;
  className?: string;
  compact?: boolean;
}) {
  const { data: wallet } = useWalletClient();
  const [manual, setManual] = useState<string | null>(null);

  const add = async () => {
    if (!wallet) return toast.error("Connect your wallet first");
    try {
      const ok = await wallet.request({
        method: "wallet_watchAsset",
        params: { type: "ERC721", options: { address: contract, tokenId: String(tokenId) } },
      } as never);
      if (ok) toast.success("Added to your wallet 🎉");
    } catch (e) {
      const reason = walletErrorMessage(e);
      if (reason?.startsWith("You cancelled")) return toast(reason);
      setManual(reason ?? "Your wallet couldn't import this NFT automatically.");
    }
  };

  return (
    <>
      <button
        onClick={add}
        className={cn("btn-ghost-3d flex-col gap-1 px-2 py-2 text-[10px]", className)}
      >
        <Wallet className="h-4 w-4" />
        {compact ? "Wallet" : "Add to wallet"}
      </button>
      <Modal open={Boolean(manual)} onClose={() => setManual(null)}>
        <Wallet className="h-10 w-10 text-monad" />
        <h2 className="metal-text text-2xl font-black">Import it manually</h2>
        <p className="text-sm text-monad-100/80">
          {manual} Your NFT is safe on-chain; add it in MetaMask: <b>NFTs → Import NFT</b> with
          these details.
        </p>
        <CopyRow label="Contract address" value={contract} />
        <CopyRow label="Token ID" value={String(tokenId)} />
        <p className="text-xs text-monad-300">Network: Monad Testnet (chain 10143)</p>
        <button onClick={() => setManual(null)} className="btn-monad w-full">
          Done
        </button>
      </Modal>
    </>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`))
      }
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-monad-900/70 px-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-extrabold uppercase text-monad-300">{label}</span>
        <span className="block truncate font-mono text-sm text-white">{value}</span>
      </span>
      <Copy className="h-4 w-4 shrink-0 text-monad-300" />
    </button>
  );
}
