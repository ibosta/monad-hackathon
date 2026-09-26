export { moningoAbi } from "./moningo-abi";

export const EXAM_FEE_MON = "0.05";
export const EXAM_FEE_WEI = 50_000_000_000_000_000n;

export const LEVEL_NAMES = ["", "A1", "A2", "B1", "B2", "C1"] as const;

/** Daily reward tiers by streak (mirrors Moningo.rewardFor). */
export const REWARD_TIERS = [
  { from: 1, reward: 0.005 },
  { from: 7, reward: 0.01 },
  { from: 30, reward: 0.015 },
  { from: 100, reward: 0.02 },
  { from: 365, reward: 0.025 },
  { from: 1000, reward: 0.03 },
] as const;

export function rewardFor(streak: number): number {
  let r: number = REWARD_TIERS[0].reward;
  for (const t of REWARD_TIERS) if (streak >= t.from) r = t.reward;
  return r;
}

export function nextTier(streak: number) {
  return REWARD_TIERS.find((t) => t.from > streak) ?? null;
}

/**
 * Monad charges the full gas LIMIT, not gas used, and eth_estimateGas can over-estimate a lot.
 * Limits = local gas used + margin for Monad's pricier cold state access.
 */
export const GAS = {
  completeDaily: 150_000n,
  startLevelTest: 60_000n,
  claimCertificate: 260_000n,
} as const;

/** Build-time override; otherwise the address comes from the backend's /api/config. */
export function envContractAddress(): `0x${string}` | null {
  const v = process.env.NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS;
  return v && /^0x[a-fA-F0-9]{40}$/.test(v) ? (v as `0x${string}`) : null;
}

export type OnchainUser = {
  streak: number;
  claimedToday: boolean;
  /** MON paid by the next claim (today's if unclaimed, tomorrow's otherwise) */
  nextReward: number;
  certificateId: number;
  level: number;
  examPaid: boolean;
};
