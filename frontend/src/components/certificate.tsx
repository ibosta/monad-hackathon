"use client";

import { useReadContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { moningoAbi } from "@/lib/contract";
import { useContractAddress } from "@/hooks/use-moningo";
import { MONAD_CHAIN_ID, MONAD_EXPLORER } from "@/lib/wagmi";

type Metadata = { name: string; image: string; attributes: { trait_type: string; value: string | number }[] };

function decode(uri?: string): Metadata | null {
  if (!uri?.startsWith("data:application/json;base64,")) return null;
  try {
    return JSON.parse(atob(uri.split(",")[1]));
  } catch {
    return null;
  }
}

/** Renders the fully on-chain SVG certificate NFT straight from tokenURI. */
export function Certificate({ tokenId }: { tokenId: number }) {
  const contract = useContractAddress();
  const { data, isLoading } = useReadContract({
    address: contract,
    abi: moningoAbi,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(contract && tokenId) },
  });
  const meta = decode(data as string | undefined);

  if (isLoading || !meta) {
    return (
      <div className="flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-monad-900/50">
        <Loader2 className="h-6 w-6 animate-spin text-monad" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.image} alt={meta.name} className="w-full rounded-2xl shadow-2xl shadow-monad/30" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-monad-100">{meta.name}</span>
        <a
          href={`${MONAD_EXPLORER}/token/${contract}?a=${tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-monad-300 hover:underline"
        >
          View on explorer ↗
        </a>
      </div>
    </div>
  );
}
