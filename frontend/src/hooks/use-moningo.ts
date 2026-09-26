"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useCallback } from "react";
import { parseEther } from "viem";
import { moningoAbi, getContractAddress, DAILY_STAKE_MON, type MoningoUser } from "@/lib/contract";
import { fetchClaimSignature } from "@/lib/api";

/** Read on-chain user state: (streak, stakedAt, active, certificateId) */
export function useMoningoUser() {
  const { address } = useAccount();
  const contract = getContractAddress();

  const result = useReadContract({
    address: contract ?? undefined,
    abi: moningoAbi,
    functionName: "getUser",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(contract && address) },
  });

  const data = result.data as readonly [bigint, bigint, boolean, bigint] | undefined;

  const user: MoningoUser | null = data
    ? {
        streak: Number(data[0]),
        stakedAt: Number(data[1]),
        active: Boolean(data[2]),
        certificateId: Number(data[3]),
      }
    : null;

  return { ...result, user };
}

/** Read the contract reward pool (in wei). */
export function useRewardPool() {
  const contract = getContractAddress();
  return useReadContract({
    address: contract ?? undefined,
    abi: moningoAbi,
    functionName: "rewardPool",
    query: { enabled: Boolean(contract) },
  });
}

/**
 * Start a streak: sends exactly 0.1 MON to startStreak().
 * Returns mutation state helpers.
 */
export function useStartStreak() {
  const { writeContractAsync, isPending, isError, error, reset } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const startStreak = useCallback(async () => {
    const contract = getContractAddress();
    if (!contract) throw new Error("Contract address not configured. Set NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS or start the backend.");
    const hash = await writeContractAsync({
      address: contract,
      abi: moningoAbi,
      functionName: "startStreak",
      value: parseEther(DAILY_STAKE_MON),
    });
    setTxHash(hash);
    return hash;
  }, [writeContractAsync]);

  return {
    startStreak,
    isPending,
    isConfirming,
    isConfirmed,
    isError,
    error,
    txHash,
    reset,
  };
}

/**
 * Complete the English task: requires a verifier signature from the backend.
 * Flow: POST /api/sync-progress (or /api/claim-signature) -> signature -> completeEnglishTask(signature)
 */
export function useCompleteTask() {
  const { writeContractAsync, isPending, isError, error, reset } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const completeTask = useCallback(
    async (signature: `0x${string}`) => {
      const contract = getContractAddress();
      if (!contract) throw new Error("Contract address not configured.");
      const hash = await writeContractAsync({
        address: contract,
        abi: moningoAbi,
        functionName: "completeEnglishTask",
        args: [signature],
      });
      setTxHash(hash);
      return hash;
    },
    [writeContractAsync]
  );

  return {
    completeTask,
    isPending,
    isConfirming,
    isConfirmed,
    isError,
    error,
    txHash,
    reset,
  };
}

/**
 * Claim the soulbound NFT certificate (after CERT_THRESHOLD=3 completions).
 */
export function useClaimCertificate() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const claimCertificate = useCallback(async () => {
    const contract = getContractAddress();
    if (!contract) throw new Error("Contract address not configured.");
    const hash = await writeContractAsync({
      address: contract,
      abi: moningoAbi,
      functionName: "claimCertificate",
    });
    setTxHash(hash);
    return hash;
  }, [writeContractAsync]);

  return { claimCertificate, isPending, isConfirming, isConfirmed, txHash };
}

/**
 * High-level helper: fetch a claim signature from the backend, then call completeEnglishTask.
 * Used by the quiz completion modal.
 */
export function useClaimAndComplete() {
  const { address } = useAccount();
  const completeTask = useCompleteTask();
  const [signature, setSignature] = useState<`0x${string}` | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const claimSignature = useCallback(async (): Promise<`0x${string}` | null> => {
    if (!address) {
      setFetchError("Connect your wallet first.");
      return null;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetchClaimSignature(address);
      if (!res.success || !res.signature) {
        setFetchError(res.message || "Could not get claim signature from backend.");
        return null;
      }
      setSignature(res.signature as `0x${string}`);
      return res.signature as `0x${string}`;
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch signature.");
      return null;
    } finally {
      setFetching(false);
    }
  }, [address]);

  const run = useCallback(async () => {
    const sig = await claimSignature();
    if (!sig) return;
    await completeTask.completeTask(sig);
  }, [claimSignature, completeTask]);

  return {
    run,
    signature,
    fetching,
    fetchError,
    completePending: completeTask.isPending,
    completeConfirming: completeTask.isConfirming,
    completeConfirmed: completeTask.isConfirmed,
    completeError: completeTask.error,
    txHash: completeTask.txHash,
  };
}
