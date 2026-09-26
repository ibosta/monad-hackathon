import type { OnchainUser } from "./contract";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

export type Lesson = { id: number; type: string; question: string; options: string[]; answer: string };
export type ExamQuestion = { id: number; level: number; question: string; options: string[] };

export type AppConfig = {
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl: string;
  contractAddress: string | null;
  dailyStake: string;
  reward: string;
  examFee: string;
  rewardPool: string | null;
  lessonsPerDay: number;
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
  rewardSignedToday: boolean;
  onchain: OnchainUser | null;
};

export type LeaderboardEntry = { walletAddress: string; totalScore: number; lessonsCompleted: number };

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

const post = <T,>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) });

export const api = {
  config: () => request<AppConfig>("/api/config"),
  lessons: () => request<Lesson[]>("/api/english-lessons"),
  syncProgress: (walletAddress: string, lessonId: number, score: number) =>
    post<SyncProgressResponse>("/api/sync-progress", { walletAddress, lessonId, score }),
  claimSignature: (walletAddress: string) =>
    post<{ success: boolean; signature: `0x${string}` }>("/api/claim-signature", { walletAddress }),
  levelTest: () => request<{ fee: string; questions: ExamQuestion[] }>("/api/level-test"),
  submitLevelTest: (walletAddress: string, answers: Record<number, string>) =>
    post<ExamResult>("/api/level-test/submit", { walletAddress, answers }),
  user: (address: string) => request<UserResponse>(`/api/users/${address}`),
  leaderboard: () => request<LeaderboardEntry[]>("/api/leaderboard"),
};
