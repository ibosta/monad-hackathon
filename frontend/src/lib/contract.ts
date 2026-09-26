export { moningoAbi } from "./moningo-abi";

export const DAILY_STAKE_MON = "0.1";
export const REWARD_MON = "0.05";
export const EXAM_FEE_MON = "0.05";
export const DAILY_STAKE_WEI = 100_000_000_000_000_000n;
export const EXAM_FEE_WEI = 50_000_000_000_000_000n;

export const LEVEL_NAMES = ["", "A1", "A2", "B1", "B2", "C1"] as const;

/**
 * Monad charges the full gas LIMIT, not gas used, and eth_estimateGas over-estimates
 * completeEnglishTask (~1.1M vs ~110k needed). Limits below were measured on Monad Testnet.
 */
export const GAS = {
  startStreak: 90_000n,
  completeEnglishTask: 130_000n,
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
  stakedAt: number;
  active: boolean;
  certificateId: number;
  level: number;
  examPaid: boolean;
};
