"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { api } from "@/lib/api";
import { GAS, envContractAddress, moningoAbi, type OnchainUser } from "@/lib/contract";
import { MONAD_CHAIN_ID } from "@/lib/wagmi";
import { walletErrorMessage } from "@/lib/wallet-errors";

type WriteFn = keyof typeof GAS;

export type TxResult = { hash: `0x${string}`; ms: number };

export function useAppConfig() {
  return useQuery({ queryKey: ["config"], queryFn: api.config, staleTime: 15_000 });
}

export function useContractAddress(): `0x${string}` | undefined {
  const { data } = useAppConfig();
  return envContractAddress() ?? ((data?.contractAddress as `0x${string}` | null) || undefined);
}

/** On-chain Moningo state for the connected wallet. */
export function useOnchainUser() {
  const { address } = useAccount();
  const contract = useContractAddress();
  const q = useReadContract({
    address: contract,
    abi: moningoAbi,
    functionName: "getUser",
    args: address ? [address] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(contract && address), refetchInterval: 4_000 },
  });
  const d = q.data;
  const user: OnchainUser | null = d
    ? {
        streak: Number(d[0]),
        stakedAt: Number(d[1]),
        active: d[2],
        certificateId: Number(d[3]),
        level: Number(d[4]),
        examPaid: d[5],
      }
    : null;
  return { ...q, user };
}

export function useMonBalance() {
  const { address } = useAccount();
  return useBalance({ address, chainId: MONAD_CHAIN_ID, query: { enabled: Boolean(address), refetchInterval: 4_000 } });
}

type ChainTx = {
  address: `0x${string}` | undefined;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  gas: bigint;
};

/** Sends any contract write on Monad with an explicit gas limit (Monad bills the full limit) and waits for the receipt. */
export function useChainTx() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: MONAD_CHAIN_ID });

  return useCallback(
    async ({ address, abi, functionName, args = [], value, gas }: ChainTx): Promise<TxResult> => {
      if (!address) throw new Error("Contract not deployed yet (backend has no address).");
      if (!client) throw new Error("No Monad RPC client");
      if (chainId !== MONAD_CHAIN_ID) await switchChainAsync({ chainId: MONAD_CHAIN_ID });

      const t0 = performance.now();
      const hash = await writeContractAsync({ address, abi, functionName, args, value, gas, chainId: MONAD_CHAIN_ID } as never);
      const receipt = await client.waitForTransactionReceipt({ hash, pollingInterval: 250 });
      const ms = Math.round(performance.now() - t0);
      if (receipt.status !== "success") {
        // Re-simulate to surface the custom error name (WrongStake, BadSignature, …).
        try {
          await client.simulateContract({ address, abi, functionName, args, value, account: receipt.from } as never);
        } catch (e) {
          throw new Error(explainError(e));
        }
        throw new Error("Transaction reverted. Wait a few seconds and retry.");
      }
      return { hash, ms };
    },
    [client, chainId, switchChainAsync, writeContractAsync]
  );
}

/** Moningo (daily/exam) transactions with Monad-tuned gas limits. */
export function useMoningoTx() {
  const contract = useContractAddress();
  const send = useChainTx();
  return useCallback(
    (functionName: WriteFn, args: readonly unknown[] = [], value?: bigint) =>
      send({ address: contract, abi: moningoAbi, functionName, args, value, gas: GAS[functionName] }),
    [contract, send]
  );
}

const FRIENDLY: Record<string, string> = {
  WrongStake: "Stake must be exactly 0.1 MON.",
  StreakActive: "You already staked today. Finish your lessons!",
  NoActiveStreak: "Stake 0.1 MON first to start today's streak.",
  StreakExpired: "Your 24h window expired. Start a new streak.",
  BadSignature: "Lesson proof rejected. Re-sync your lessons.",
  WrongFee: "Exam fee must be exactly 0.05 MON.",
  NoPaidExam: "Pay the exam fee first.",
  BadLevel: "Invalid level.",
  NotYourMatch: "That match isn't yours.",
  AlreadyJoined: "You already staked for this duel.",
  MatchClosed: "This duel is already closed.",
  WrongPayment: "Wrong energy pack payment.",
  AlreadyClaimed: "Checkpoint reward already claimed.",
  PoolEmpty: "Reward pool is empty right now. Try later.",
  BadCheckpoint: "That level is not a checkpoint.",
};

export function explainError(e: unknown): string {
  const wallet = walletErrorMessage(e);
  if (wallet) return wallet;
  if (e instanceof BaseError) {
    const revert = e.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? "";
      return FRIENDLY[name] ?? name ?? revert.shortMessage;
    }
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}
