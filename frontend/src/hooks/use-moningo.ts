"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { api } from "@/lib/api";
import { GAS, envContractAddress, moningoAbi, type OnchainUser } from "@/lib/contract";
import { MONAD_CHAIN_ID } from "@/lib/wagmi";

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

/** Sends a Moningo transaction with a fixed Monad-tuned gas limit and waits for the receipt. */
export function useMoningoTx() {
  const contract = useContractAddress();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: MONAD_CHAIN_ID });

  return useCallback(
    async (functionName: WriteFn, args: readonly unknown[] = [], value?: bigint): Promise<TxResult> => {
      if (!contract) throw new Error("Contract not deployed yet (backend has no address).");
      if (!client) throw new Error("No Monad RPC client");
      if (chainId !== MONAD_CHAIN_ID) await switchChainAsync({ chainId: MONAD_CHAIN_ID });

      const t0 = performance.now();
      const hash = await writeContractAsync({
        address: contract,
        abi: moningoAbi,
        functionName,
        args,
        value,
        gas: GAS[functionName],
        chainId: MONAD_CHAIN_ID,
      } as Parameters<typeof writeContractAsync>[0]);
      const receipt = await client.waitForTransactionReceipt({ hash, pollingInterval: 250 });
      const ms = Math.round(performance.now() - t0);
      if (receipt.status !== "success") {
        // Re-simulate to surface the custom error name (WrongStake, BadSignature, …).
        try {
          await client.simulateContract({ address: contract, abi: moningoAbi, functionName, args, value, account: receipt.from } as never);
        } catch (e) {
          throw new Error(explainError(e));
        }
        throw new Error("Transaction reverted. Wait a few seconds and retry.");
      }
      return { hash, ms };
    },
    [contract, client, chainId, switchChainAsync, writeContractAsync]
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
};

export function explainError(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? "";
      return FRIENDLY[name] ?? name ?? revert.shortMessage;
    }
    if (/rejected|denied/i.test(e.message)) return "Transaction rejected in wallet.";
    if (/insufficient/i.test(e.message)) return "Not enough MON. Get some from the faucet.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}
