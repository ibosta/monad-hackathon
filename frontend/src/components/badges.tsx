"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useReadContract, useWalletClient } from "wagmi";
import { toast } from "sonner";
import { Lock, Loader2, Wallet } from "lucide-react";
import { spring } from "@/components/motion";
import { api, type Badge } from "@/lib/api";
import { badgesAbi } from "@/lib/games-abi";
import { withTxToast } from "@/lib/tx-toast";
import { useChainTx } from "@/hooks/use-moningo";
import { MONAD_CHAIN_ID } from "@/lib/wagmi";
import { walletErrorMessage } from "@/lib/wallet-errors";
import { cn } from "@/lib/utils";

const MINT_GAS = 320_000n;
const ICON: Record<number, string> = {
  1: "🔥",
  2: "🌋",
  3: "💯",
  4: "👑",
  11: "⚔️",
  12: "⚡",
  13: "🏆",
};

/** Achievement NFTs: streak milestones (trustless) and duel win streaks (backend-signed). */
export function BadgeCollection({ address }: { address: `0x${string}` }) {
  const { data, refetch } = useQuery({
    queryKey: ["badges", address],
    queryFn: () => api.badges(address),
  });
  const send = useChainTx();
  const [busy, setBusy] = useState<number | null>(null);

  if (!data) return <div className="metal-card h-40 animate-pulse" />;
  const contract = data.contract as `0x${string}`;

  const mint = async (b: Badge) => {
    setBusy(b.id);
    try {
      if (b.kind === "streak") {
        await withTxToast(`Mint "${b.name}"`, () =>
          send({
            address: contract,
            abi: badgesAbi,
            functionName: "claimStreakBadge",
            args: [BigInt(b.id)],
            gas: MINT_GAS,
          })
        );
      } else {
        const { signature } = await api.badgeSignature(address, b.id);
        await withTxToast(`Mint "${b.name}"`, () =>
          send({
            address: contract,
            abi: badgesAbi,
            functionName: "claimDuelBadge",
            args: [BigInt(b.id), signature],
            gas: MINT_GAS,
          })
        );
      }
      await refetch();
    } catch (e) {
      if (!(e instanceof Error && /reverted|rejected|cancel/i.test(e.message)))
        toast.error(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-monad-200">
        🔥 Streak {data.streak} days · ⚔️ Duel win streak {data.duelWinStreak} (best{" "}
        {data.bestDuelWinStreak})
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.badges.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            className={cn(
              "metal-card flex flex-col items-center gap-2 p-3 text-center",
              !b.earned && !b.tokenId && "opacity-70"
            )}
          >
            {b.tokenId ? (
              <BadgeImage contract={contract} tokenId={b.tokenId} name={b.name} />
            ) : (
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full text-4xl",
                  b.earned
                    ? "bg-gradient-to-br from-yellow-300/30 to-monad/30"
                    : "bg-monad-900 grayscale"
                )}
              >
                {b.earned ? ICON[b.id] : <Lock className="h-7 w-7 text-monad-500" />}
              </div>
            )}
            <p className="text-sm font-black leading-tight text-white">{b.name}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-monad-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-monad to-yellow-300"
                style={{ width: `${Math.min(100, (b.progress / b.threshold) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-monad-300">
              {Math.min(b.progress, b.threshold)}/{b.threshold}{" "}
              {b.kind === "streak" ? "days" : "wins in a row"}
            </p>
            {b.tokenId ? (
              <AddToWallet contract={contract} tokenId={b.tokenId} />
            ) : b.earned ? (
              <button
                onClick={() => mint(b)}
                disabled={busy !== null}
                className="btn-green w-full px-2 py-2 text-xs"
              >
                {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mint NFT"}
              </button>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BadgeImage({
  contract,
  tokenId,
  name,
}: {
  contract: `0x${string}`;
  tokenId: number;
  name: string;
}) {
  const { data } = useReadContract({
    address: contract,
    abi: badgesAbi,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
    chainId: MONAD_CHAIN_ID,
  });
  let image: string | null = null;
  try {
    image = data ? JSON.parse(atob(String(data).split(",")[1])).image : null;
  } catch {
    image = null;
  }
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <motion.img
      initial={{ rotateY: 90 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.6 }}
      src={image}
      alt={name}
      className="h-20 w-20 rounded-2xl"
    />
  ) : (
    <div className="h-20 w-20 animate-pulse rounded-2xl bg-monad-900" />
  );
}

function AddToWallet({ contract, tokenId }: { contract: string; tokenId: number }) {
  const { data: wallet } = useWalletClient();
  return (
    <button
      onClick={async () => {
        try {
          await wallet?.request({
            method: "wallet_watchAsset",
            params: { type: "ERC721", options: { address: contract, tokenId: String(tokenId) } },
          } as never);
          toast.success("Badge added to your wallet");
        } catch (e) {
          toast.error("Couldn't add to wallet", {
            description: walletErrorMessage(e) ?? "Import it manually in your wallet's NFT tab.",
          });
        }
      }}
      className="btn-ghost-3d w-full px-2 py-2 text-[10px]"
    >
      <Wallet className="h-3.5 w-3.5" /> Add to wallet
    </button>
  );
}
