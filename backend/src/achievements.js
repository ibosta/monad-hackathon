// Streak tree (MoningoStreakRewards) + achievement badges (MoningoBadges) + duel win streaks.
const express = require("express");
const { isAddress, getAddress, formatEther } = require("viem");
const { client, verifier, getOnchainUser } = require("./chain");

const load = (name) => {
  try {
    return require(`./contract/${name}.json`);
  } catch {
    return { address: "", abi: [] };
  }
};
const streak = load("streak");
const badges = load("badges");

const DUELS_PER_DAY = 5;

/** Mirrors Moningo.rewardFor: daily reward (MON) for a given streak day. */
function dailyRewardAt(streak) {
  if (streak >= 1000) return "0.03";
  if (streak >= 365) return "0.025";
  if (streak >= 100) return "0.02";
  if (streak >= 30) return "0.015";
  if (streak >= 7) return "0.01";
  return "0.005";
}
const BADGES = [
  { id: 1, name: "10-Day Streak", kind: "streak", threshold: 10 },
  { id: 2, name: "50-Day Streak", kind: "streak", threshold: 50 },
  { id: 3, name: "100-Day Streak", kind: "streak", threshold: 100 },
  { id: 4, name: "1000-Day Legend", kind: "streak", threshold: 1000 },
  { id: 11, name: "Duel Hot Streak", kind: "duel", threshold: 3 },
  { id: 12, name: "Duel Unstoppable", kind: "duel", threshold: 5 },
  { id: 13, name: "Duel Champion", kind: "duel", threshold: 10 },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Current and best consecutive duel wins (a loss or draw breaks the streak). */
async function duelWinStreaks(prisma, address) {
  const rows = await prisma.duelResult.findMany({
    where: { OR: [{ p1: address }, { p2: address }] },
    orderBy: { createdAt: "asc" },
  });
  let current = 0;
  let best = 0;
  for (const r of rows) {
    current = r.winner === address ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best, played: rows.length };
}

async function duelsToday(prisma, address) {
  const start = new Date(`${today()}T00:00:00.000Z`);
  return prisma.duelResult.count({
    where: { OR: [{ p1: address }, { p2: address }], createdAt: { gte: start } },
  });
}

let milestoneCache = null;
async function milestones() {
  if (milestoneCache || !streak.address) return milestoneCache ?? [];
  const [days, rewards] = await client.readContract({
    address: streak.address,
    abi: streak.abi,
    functionName: "milestones",
  });
  milestoneCache = days.map((d, i) => ({ day: Number(d), reward: formatEther(rewards[i]) }));
  return milestoneCache;
}

function achievementsRouter(prisma) {
  const r = express.Router();
  const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
  const addr = (v) => (isAddress(v || "") ? getAddress(v) : null);

  r.get(
    "/streak-tree/:address",
    wrap(async (req, res) => {
      const address = addr(req.params.address);
      if (!address) return res.status(400).json({ message: "Invalid address" });
      const [ms, onchain] = await Promise.all([
        milestones(),
        getOnchainUser(address).catch(() => null),
      ]);
      const claimed = ms.length
        ? await client.multicall({
            contracts: ms.map((m) => ({
              address: streak.address,
              abi: streak.abi,
              functionName: "claimed",
              args: [address, BigInt(m.day)],
            })),
            allowFailure: true,
          })
        : [];
      const current = onchain?.streak ?? 0;
      const nodes = ms.map((m, i) => ({
        ...m,
        dailyReward: dailyRewardAt(m.day),
        reached: current >= m.day,
        claimed: claimed[i]?.status === "success" && claimed[i].result,
      }));
      const next = nodes.find((n) => !n.reached) ?? null;
      res.json({
        contract: streak.address,
        streak: current,
        dailyReward: onchain?.nextReward ?? "0.005",
        milestones: nodes,
        next,
        daysToNext: next ? next.day - current : 0,
      });
    })
  );

  r.get(
    "/badges/:address",
    wrap(async (req, res) => {
      const address = addr(req.params.address);
      if (!address) return res.status(400).json({ message: "Invalid address" });
      const [onchain, duel] = await Promise.all([
        getOnchainUser(address).catch(() => null),
        duelWinStreaks(prisma, address),
      ]);
      const owned = badges.address
        ? await client.multicall({
            contracts: BADGES.map((b) => ({
              address: badges.address,
              abi: badges.abi,
              functionName: "badgeToken",
              args: [address, BigInt(b.id)],
            })),
            allowFailure: true,
          })
        : [];
      const list = BADGES.map((b, i) => {
        const progress = b.kind === "streak" ? (onchain?.streak ?? 0) : duel.best;
        const tokenId = owned[i]?.status === "success" ? Number(owned[i].result) : 0;
        return { ...b, progress, earned: progress >= b.threshold, tokenId };
      });
      res.json({
        contract: badges.address,
        streak: onchain?.streak ?? 0,
        duelWinStreak: duel.current,
        bestDuelWinStreak: duel.best,
        badges: list,
      });
    })
  );

  r.post(
    "/badges/signature",
    wrap(async (req, res) => {
      const address = addr(req.body?.address);
      const badge = BADGES.find((b) => b.id === Number(req.body?.id));
      if (!address || !badge || badge.kind !== "duel" || !verifier || !badges.address)
        return res.status(400).json({ message: "Invalid badge" });
      const { best } = await duelWinStreaks(prisma, address);
      if (best < badge.threshold)
        return res
          .status(403)
          .json({ message: `Win ${badge.threshold} duels in a row first (best: ${best})` });
      const digest = await client.readContract({
        address: badges.address,
        abi: badges.abi,
        functionName: "badgeDigest",
        args: [address, BigInt(badge.id)],
      });
      res.json({
        success: true,
        signature: await verifier.signMessage({ message: { raw: digest } }),
      });
    })
  );

  return r;
}

module.exports = {
  dailyRewardAt,
  achievementsRouter,
  duelWinStreaks,
  duelsToday,
  DUELS_PER_DAY,
  streak,
  badges,
};
