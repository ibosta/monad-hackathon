/**
 * Backend API client for Moningo.
 *
 * Endpoints (see backend/src/index.js):
 *   GET  /api/config              -> chain config + contract address + abi
 *   GET  /api/english-lessons      -> Lesson[] (direct array)
 *   POST /api/sync-progress        -> { success, lessonsDoneToday, completedToday, signature, claimError }
 *   POST /api/claim-signature      -> { success, signature }
 *   GET  /api/users/:address       -> { totalScore, lessonsCompleted, todayProgress, completedToday, onchain }
 *   GET  /api/leaderboard          -> User[]
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export type Lesson = {
  id: number;
  type: "vocabulary" | "grammar" | "translation" | string;
  question: string;
  options: string[];
  answer: string;
};

export type AppConfig = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  contractAddress: string | null;
  dailyStake: string;
  reward: string;
  certThreshold: number;
  rewardPool: string | null;
  lessonsPerDay: number;
};

export type SyncProgressResponse = {
  success: boolean;
  message?: string;
  lessonsDoneToday: number;
  lessonsPerDay: number;
  completedToday: boolean;
  signature: string | null;
  claimError: string | null;
};

export type OnchainUser = {
  streak: number;
  stakedAt: number;
  active: boolean;
  certificateId: number;
} | null;

export type UserResponse = {
  walletAddress: string;
  totalScore: number;
  lessonsCompleted: number;
  todayProgress: { lessonId: number; score: number }[];
  completedToday: boolean;
  onchain: OnchainUser;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.message || body?.error || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/** Fetch the backend-provided app/chain config. Returns null if backend is down. */
export async function fetchConfig(): Promise<AppConfig | null> {
  try {
    return await request<AppConfig>("/api/config");
  } catch (err) {
    console.warn("[api] /api/config failed:", err);
    return null;
  }
}

/**
 * Fetch today's English lessons.
 * Backend returns a bare array, but we defensively support { lessons: [...] }.
 */
export async function fetchLessons(): Promise<Lesson[]> {
  const data = await request<unknown>("/api/english-lessons");
  if (Array.isArray(data)) return data as Lesson[];
  if (data && typeof data === "object" && Array.isArray((data as any).lessons)) {
    return (data as any).lessons as Lesson[];
  }
  return [];
}

export async function syncProgress(
  walletAddress: string,
  lessonId: number,
  score: number
): Promise<SyncProgressResponse> {
  return request<SyncProgressResponse>("/api/sync-progress", {
    method: "POST",
    body: JSON.stringify({ walletAddress, lessonId, score }),
  });
}

export async function fetchClaimSignature(walletAddress: string): Promise<{
  success: boolean;
  signature?: string | null;
  message?: string;
}> {
  return request<{ success: boolean; signature?: string | null; message?: string }>(
    "/api/claim-signature",
    {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }
  );
}

export async function fetchUser(address: string): Promise<UserResponse | null> {
  try {
    return await request<UserResponse>(`/api/users/${address}`);
  } catch (err) {
    console.warn("[api] /api/users failed:", err);
    return null;
  }
}

export type LeaderboardEntry = {
  walletAddress: string;
  totalScore: number;
  lessonsCompleted: number;
};

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const data = await request<unknown>("/api/leaderboard");
    return Array.isArray(data) ? (data as LeaderboardEntry[]) : [];
  } catch (err) {
    console.warn("[api] /api/leaderboard failed:", err);
    return [];
  }
}

export { BACKEND_URL };
