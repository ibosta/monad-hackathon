/**
 * Moningo smart contract integration.
 *
 * Mirrors contracts/contracts/Moningo.sol:
 *   - startStreak() payable 0.1 MON (DAILY_STAKE)
 *   - completeEnglishTask(bytes signature) -> returns stake (0.1) + reward (0.01 if pool funded)
 *   - getUser(address) -> (streak, stakedAt, active, certificateId)
 *   - rewardPool() -> uint256
 *   - claimCertificate() -> soulbound NFT after CERT_THRESHOLD (3) tasks
 *
 * Contract address is sourced from:
 *   1. NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS env (explicit frontend override)
 *   2. NEXT_PUBLIC_BACKEND_URL/api/config -> contractAddress (shared with backend deployment)
 */
export const DAILY_STAKE_MON = "0.1";
export const DAILY_STAKE_WEI = 100000000000000000n; // 0.1 ether
export const REWARD_MON = "0.01";
export const CERT_THRESHOLD = 3;

export function getContractAddress(): `0x${string}` | null {
  const fromEnv = process.env.NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS;
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) {
    return fromEnv as `0x${string}`;
  }
  return null;
}

/** Minimal ABI: only the functions the frontend actually calls. */
export const moningoAbi = [
  {
    type: "function",
    name: "startStreak",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "completeEnglishTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "signature", type: "bytes" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getUser",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "streak", type: "uint256" },
      { name: "stakedAt", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "certificateId", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "rewardPool",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimCertificate",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "taskDigest",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "event",
    name: "StreakStarted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TaskCompleted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "newStreak", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RewardPaid",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;

export type MoningoUser = {
  streak: number;
  stakedAt: number;
  active: boolean;
  certificateId: number;
};
