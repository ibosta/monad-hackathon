// Practice level map: energy (10 max, +1 every 15 min), levels of 3 questions graded server-side,
// MON energy packs (MoningoPractice.buyEnergy) and signed checkpoint rewards every 10 levels.
const express = require("express");
const { isAddress, getAddress, decodeEventLog } = require("viem");
const { client, verifier, ready } = require("./chain");
const { practice } = require("./signer");
const { POOL, seeded } = require("./lessons");
const { QUESTIONS: EXAM } = require("./level-test");

const MAX_ENERGY = 10;
const ENERGY_PER_PACK = 5;
const MAX_BANKED_ENERGY = 30; // regen stops at 10; bought packs can top up to 30
const REGEN_MS = 15 * 60 * 1000;
const TOTAL_LEVELS = 50;
const CHECKPOINT_EVERY = 10;
const QUESTIONS_PER_LEVEL = 3;
const PASS_AT = 2;

const BANK = [...POOL, ...EXAM.map((q) => ({ ...q, type: q.level >= 4 ? "advanced" : "grammar" }))];
const byId = new Map(BANK.map((q) => [q.id, q]));

/** Deterministic questions per level; later levels lean on harder exam questions. */
function questionsForLevel(level) {
  const rand = seeded(level * 7919);
  const tier = Math.min(5, Math.ceil(level / 10));
  const pool = level <= 10 ? POOL : BANK.filter((q) => !q.level || q.level <= tier + 1);
  const picked = [...pool].sort(() => rand() - 0.5).slice(0, QUESTIONS_PER_LEVEL);
  return picked.map((q) => ({ ...q, options: [...q.options].sort(() => rand() - 0.5) }));
}

/** Current energy after regeneration (purchased energy can exceed MAX_ENERGY and does not regen). */
function energyNow(user, now = Date.now()) {
  const last = new Date(user.energyUpdatedAt).getTime();
  if (user.energy >= MAX_ENERGY) return { energy: user.energy, anchor: now, nextAt: null };
  const gained = Math.floor((now - last) / REGEN_MS);
  const energy = Math.min(MAX_ENERGY, user.energy + gained);
  const anchor = energy >= MAX_ENERGY ? now : last + gained * REGEN_MS;
  return { energy, anchor, nextAt: energy >= MAX_ENERGY ? null : anchor + REGEN_MS };
}

function practiceRouter(prisma) {
  const r = express.Router();
  const sessions = new Map(); // address -> { level, qids, answers }

  const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
  const addr = (v) => (isAddress(v || "") ? getAddress(v) : null);
  const getUser = (address) =>
    prisma.user.upsert({
      where: { walletAddress: address },
      update: {},
      create: { walletAddress: address },
    });

  async function claimedCheckpoints(address, reached) {
    const levels = [];
    for (let l = CHECKPOINT_EVERY; l <= reached; l += CHECKPOINT_EVERY) levels.push(l);
    if (!levels.length || !practice.address || !ready()) return {};
    const res = await client.multicall({
      contracts: levels.map((l) => ({
        address: practice.address,
        abi: practice.abi,
        functionName: "checkpointClaimed",
        args: [address, BigInt(l)],
      })),
      allowFailure: true,
    });
    return Object.fromEntries(
      levels.map((l, i) => [l, res[i].status === "success" && res[i].result])
    );
  }

  r.get(
    "/:address",
    wrap(async (req, res) => {
      const address = addr(req.params.address);
      if (!address) return res.status(400).json({ message: "Invalid address" });
      const user = await getUser(address);
      const { energy, nextAt } = energyNow(user);
      const stars = await prisma.practiceStar.findMany({
        where: { userId: user.id },
        select: { level: true, stars: true },
      });
      const claimed = await claimedCheckpoints(address, user.practiceLevel).catch(() => ({}));
      const checkpoints = [];
      for (let l = CHECKPOINT_EVERY; l <= TOTAL_LEVELS; l += CHECKPOINT_EVERY) {
        checkpoints.push({
          level: l,
          reached: user.practiceLevel >= l,
          claimed: Boolean(claimed[l]),
        });
      }
      res.json({
        energy,
        maxEnergy: MAX_ENERGY,
        nextEnergyAt: nextAt,
        regenMinutes: REGEN_MS / 60000,
        maxBankedEnergy: MAX_BANKED_ENERGY,
        canBuy: energy + ENERGY_PER_PACK <= MAX_BANKED_ENERGY,
        level: user.practiceLevel,
        totalLevels: TOTAL_LEVELS,
        stars: Object.fromEntries(stars.map((s) => [s.level, s.stars])),
        checkpoints,
        contract: practice.address,
        packPrice: "0.01",
        energyPerPack: ENERGY_PER_PACK,
        checkpointReward: "0.02",
      });
    })
  );

  r.post(
    "/start",
    wrap(async (req, res) => {
      const address = addr(req.body?.address);
      const level = Number(req.body?.level);
      if (!address) return res.status(400).json({ message: "Invalid address" });
      const user = await getUser(address);
      if (
        !Number.isInteger(level) ||
        level < 1 ||
        level > TOTAL_LEVELS ||
        level > user.practiceLevel + 1
      ) {
        return res.status(400).json({ message: "Level locked" });
      }
      const { energy, anchor } = energyNow(user);
      if (energy < 1) return res.status(402).json({ message: "Out of energy", code: "NO_ENERGY" });
      await prisma.user.update({
        where: { id: user.id },
        data: {
          energy: energy - 1,
          energyUpdatedAt: new Date(energy >= MAX_ENERGY ? Date.now() : anchor),
        },
      });
      const questions = questionsForLevel(level);
      sessions.set(address, { level, qids: questions.map((q) => q.id), answers: {} });
      res.json({
        level,
        energy: energy - 1,
        questions: questions.map(({ answer, level: _l, ...q }) => q),
      });
    })
  );

  r.post(
    "/answer",
    wrap(async (req, res) => {
      const address = addr(req.body?.address);
      const s = sessions.get(address);
      const qid = Number(req.body?.questionId);
      if (!s || !s.qids.includes(qid)) return res.status(400).json({ message: "No active level" });
      const q = byId.get(qid);
      const correct = req.body?.option === q.answer;
      if (!(qid in s.answers)) s.answers[qid] = correct; // first answer counts
      res.json({ correct, answer: q.answer });
    })
  );

  r.post(
    "/finish",
    wrap(async (req, res) => {
      const address = addr(req.body?.address);
      const s = sessions.get(address);
      if (!s) return res.status(400).json({ message: "No active level" });
      sessions.delete(address);
      const correct = Object.values(s.answers).filter(Boolean).length;
      const passed = correct >= PASS_AT;
      const stars = passed ? correct : 0;
      const user = await getUser(address);
      if (passed) {
        const key = { userId_level: { userId: user.id, level: s.level } };
        const prev = await prisma.practiceStar.findUnique({ where: key });
        await prisma.practiceStar.upsert({
          where: key,
          update: { stars: Math.max(stars, prev?.stars ?? 0) },
          create: { userId: user.id, level: s.level, stars },
        });
        if (s.level > user.practiceLevel) {
          await prisma.user.update({
            where: { id: user.id },
            data: { practiceLevel: s.level, totalScore: { increment: stars * 10 } },
          });
        }
      }
      res.json({
        passed,
        stars,
        correct,
        total: s.qids.length,
        level: s.level,
        checkpoint: passed && s.level % CHECKPOINT_EVERY === 0 ? s.level : null,
      });
    })
  );

  /** Credits energy for a confirmed MoningoPractice.buyEnergy tx (idempotent per tx). */
  r.post(
    "/energy/credit",
    wrap(async (req, res) => {
      const address = addr(req.body?.address);
      const txHash = req.body?.txHash;
      if (!address || !/^0x[0-9a-fA-F]{64}$/.test(txHash || ""))
        return res.status(400).json({ message: "Invalid input" });
      if (await prisma.energyPurchase.findUnique({ where: { txHash } }))
        return res.status(409).json({ message: "Already credited" });
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });
      if (
        receipt.status !== "success" ||
        receipt.to?.toLowerCase() !== practice.address.toLowerCase()
      ) {
        return res.status(400).json({ message: "Not a successful energy purchase" });
      }
      let bought = 0;
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: practice.abi, data: log.data, topics: log.topics });
          if (ev.eventName === "EnergyPurchased" && getAddress(ev.args.user) === address)
            bought += Number(ev.args.energy);
        } catch {
          /* other event */
        }
      }
      if (!bought)
        return res.status(400).json({ message: "No EnergyPurchased event for this address" });
      const user = await getUser(address);
      const { energy } = energyNow(user);
      // The UI blocks buying past the cap; the balance itself never exceeds MAX_BANKED_ENERGY.
      const credited = Math.max(0, Math.min(bought, MAX_BANKED_ENERGY - energy));
      await prisma.$transaction([
        prisma.energyPurchase.create({ data: { txHash, address, energy: credited } }),
        prisma.user.update({
          where: { id: user.id },
          data: { energy: energy + credited, energyUpdatedAt: new Date() },
        }),
      ]);
      res.json({ success: true, energy: energy + credited, credited });
    })
  );

  r.post(
    "/checkpoint-signature",
    wrap(async (req, res) => {
      const address = addr(req.body?.address);
      const level = Number(req.body?.level);
      if (!address || !verifier || !practice.address)
        return res.status(400).json({ message: "Unavailable" });
      const user = await getUser(address);
      if (level % CHECKPOINT_EVERY !== 0 || user.practiceLevel < level)
        return res.status(403).json({ message: "Checkpoint not reached" });
      const digest = await client.readContract({
        address: practice.address,
        abi: practice.abi,
        functionName: "checkpointDigest",
        args: [address, BigInt(level)],
      });
      res.json({
        success: true,
        level,
        signature: await verifier.signMessage({ message: { raw: digest } }),
      });
    })
  );

  return r;
}

module.exports = {
  practiceRouter,
  energyNow,
  questionsForLevel,
  MAX_ENERGY,
  MAX_BANKED_ENERGY,
  REGEN_MS,
  TOTAL_LEVELS,
};
