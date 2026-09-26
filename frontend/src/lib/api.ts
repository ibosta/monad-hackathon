import type { OnchainUser } from "./contract";

export const WS_URL = () =>
  (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001").replace(/^http/, "ws") + "/ws";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

export type Lesson = {
  id: number;
  type: string;
  question: string;
  options: string[];
  answer: string;
  speak?: string;
};
export type ExamQuestion = { id: number; level: number; question: string; options: string[] };

export type AppConfig = {
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl: string;
  contractAddress: string | null;
  rewardTiers: { from: number; reward: string }[];
  examFee: string;
  rewardPool: string | null;
  lessonsPerDay: number;
  duel: { address: string | null; stake: string; payout: string };
  practice: { address: string | null };
};

export type DuelStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  todayPlayed: number;
  dailyLimit: number;
};

export type StreakTree = {
  contract: string;
  streak: number;
  dailyReward: string;
  milestones: {
    day: number;
    reward: string;
    dailyReward: string;
    reached: boolean;
    claimed: boolean;
  }[];
  next: { day: number; reward: string } | null;
  daysToNext: number;
};

export type Badge = {
  id: number;
  name: string;
  kind: "streak" | "duel";
  threshold: number;
  progress: number;
  earned: boolean;
  tokenId: number;
};
export type BadgesResponse = {
  contract: string;
  streak: number;
  duelWinStreak: number;
  bestDuelWinStreak: number;
  badges: Badge[];
};

export type PracticeState = {
  energy: number;
  maxEnergy: number;
  nextEnergyAt: number | null;
  regenMinutes: number;
  maxBankedEnergy: number;
  canBuy: boolean;
  level: number;
  totalLevels: number;
  stars: Record<number, number>;
  checkpoints: { level: number; reached: boolean; claimed: boolean }[];
  contract: string;
  packPrice: string;
  energyPerPack: number;
  checkpointReward: string;
};

export type PracticeQuestion = {
  id: number;
  type: string;
  question: string;
  options: string[];
  speak?: string;
};

export type SyncProgressResponse = {
  success: boolean;
  lessonsDoneToday: number;
  lessonsPerDay: number;
  completedToday: boolean;
  signature: `0x${string}` | null;
  claimError: string | null;
};

export type ExamResult = {
  success: boolean;
  correct: number;
  total: number;
  level: number;
  levelName: string;
  results: { id: number; correct: boolean }[];
  signature: `0x${string}` | null;
  claimError: string | null;
};

export type UserResponse = {
  walletAddress: string;
  totalScore: number;
  lessonsCompleted: number;
  todayProgress: { lessonId: number; score: number }[];
  completedToday: boolean;
  claimedToday: boolean;
  onchain: OnchainUser | null;
};

export type CertificateInfo = {
  tokenId: number;
  owner: string;
  contract: string;
  name: string;
  description: string;
  image: string;
  level: string;
  dailyLessons: number;
};

export type LeaderboardEntry = {
  walletAddress: string;
  totalScore: number;
  lessonsCompleted: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `API ${res.status}`);
  return body as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });

export const api = {
  config: () => request<AppConfig>("/api/config"),
  lessons: () => request<Lesson[]>("/api/english-lessons"),
  syncProgress: (walletAddress: string, lessonId: number, score: number) =>
    post<SyncProgressResponse>("/api/sync-progress", { walletAddress, lessonId, score }),
  claimSignature: (walletAddress: string) =>
    post<{ success: boolean; signature: `0x${string}` }>("/api/claim-signature", { walletAddress }),
  levelTest: (address: string) =>
    request<{ fee: string; questions: ExamQuestion[] }>(`/api/level-test?address=${address}`),
  submitLevelTest: (walletAddress: string, answers: Record<number, string>) =>
    post<ExamResult>("/api/level-test/submit", { walletAddress, answers }),
  user: (address: string) => request<UserResponse>(`/api/users/${address}`),
  leaderboard: () => request<LeaderboardEntry[]>("/api/leaderboard"),
  certificates: (address: string) => request<CertificateInfo[]>(`/api/certificates/${address}`),
  streakTree: (address: string) => request<StreakTree>(`/api/streak-tree/${address}`),
  badges: (address: string) => request<BadgesResponse>(`/api/badges/${address}`),
  badgeSignature: (address: string, id: number) =>
    post<{ signature: `0x${string}` }>("/api/badges/signature", { address, id }),
  duelStats: (address: string) => request<DuelStats>(`/api/duels/${address}`),
  practice: (address: string) => request<PracticeState>(`/api/practice/${address}`),
  practiceStart: (address: string, level: number) =>
    post<{ level: number; energy: number; questions: PracticeQuestion[] }>("/api/practice/start", {
      address,
      level,
    }),
  practiceAnswer: (address: string, questionId: number, option: string) =>
    post<{ correct: boolean; answer: string }>("/api/practice/answer", {
      address,
      questionId,
      option,
    }),
  practiceFinish: (address: string) =>
    post<{
      passed: boolean;
      stars: number;
      correct: number;
      total: number;
      level: number;
      checkpoint: number | null;
    }>("/api/practice/finish", { address }),
  creditEnergy: (address: string, txHash: string) =>
    post<{ energy: number; credited: number }>("/api/practice/energy/credit", { address, txHash }),
  checkpointSignature: (address: string, level: number) =>
    post<{ signature: `0x${string}` }>("/api/practice/checkpoint-signature", { address, level }),
  certificate: (tokenId: number) =>
    request<CertificateInfo & { valid: boolean }>(`/api/certificate/${tokenId}`),
};
