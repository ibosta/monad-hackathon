"use client";

import { motion } from "framer-motion";
import { useWalletClient } from "wagmi";
import { toast } from "sonner";
import { ExternalLink, Link2, Wallet } from "lucide-react";
import { spring } from "@/components/motion";
import type { CertificateInfo } from "@/lib/api";
import { MONAD_EXPLORER } from "@/lib/wagmi";
import { walletErrorMessage } from "@/lib/wallet-errors";

export const explorerNftUrl = (c: { contract: string; tokenId: number }) => `${MONAD_EXPLORER}/nft/${c.contract}/${c.tokenId}`;

export function verifyUrl(tokenId: number) {
  return typeof window === "undefined" ? `/verify?id=${tokenId}` : `${window.location.origin}/verify?id=${tokenId}`;
}

/** Certificate NFT with actions: add to wallet, copy public verify link, open explorer. */
export function CertificateCard({ cert, index = 0, actions = true }: { cert: CertificateInfo; index?: number; actions?: boolean }) {
  const { data: wallet } = useWalletClient();

  const addToWallet = async () => {
    if (!wallet) return toast.error("Connect your wallet first");
    try {
      const ok = await wallet.request({
        method: "wallet_watchAsset",
        params: { type: "ERC721", options: { address: cert.contract, tokenId: String(cert.tokenId) } },
      } as never);
      if (ok) toast.success("Certificate added to your wallet 🎉");
    } catch (e) {
      toast.error("Couldn't add to wallet", {
        description: walletErrorMessage(e) ?? "Your wallet may not support NFT import. Import manually: NFTs → Import NFT.",
      });
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl(cert.tokenId));
    toast.success("Verification link copied", { description: "Anyone can verify this certificate on-chain." });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ ...spring, delay: index * 0.08 }}
      whileHover={{ y: -6, rotateX: 4, rotateY: -4 }}
      style={{ transformPerspective: 900 }}
      className="metal-card space-y-3 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cert.image} alt={cert.name} className="w-full rounded-2xl shadow-xl shadow-monad/30" />
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-black text-white">{cert.name}</p>
          <p className="text-xs text-monad-300">
            Level <b className="text-monad-100">{cert.level}</b> · token #{cert.tokenId}
          </p>
        </div>
        <span className="rounded-full bg-gradient-to-br from-monad-300 to-monad-700 px-3 py-1 text-sm font-black text-white">{cert.level}</span>
      </div>
      {actions && (
        <div className="grid grid-cols-3 gap-2">
          <IconBtn onClick={addToWallet} icon={<Wallet className="h-4 w-4" />} label="Add to wallet" />
          <IconBtn onClick={copyLink} icon={<Link2 className="h-4 w-4" />} label="Verify link" />
          <a href={explorerNftUrl(cert)} target="_blank" rel="noopener noreferrer" className="btn-ghost-3d flex-col gap-1 px-2 py-2 text-[10px]">
            <ExternalLink className="h-4 w-4" />
            Explorer
          </a>
        </div>
      )}
    </motion.div>
  );
}

function IconBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="btn-ghost-3d flex-col gap-1 px-2 py-2 text-[10px]">
      {icon}
      {label}
    </button>
  );
}
