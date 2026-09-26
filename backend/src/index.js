const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { isAddress, getAddress, formatEther } = require("viem");
const chain = require("./chain");
const { lessonsForDay, today, LESSONS_PER_DAY } = require("./lessons");
const levelTest = require("./level-test");
const { practiceRouter } = require("./practice");
const { attachDuelServer } = require("./duel");
const games = require("./signer");
const achievements = require("./achievements");

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 5000;

const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "100kb" }));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    contract: chain.CONTRACT_ADDRESS,
    verifier: chain.verifier?.address ?? null,
  });
});

app.get(
  "/api/config",
  wrap(async (_req, res) => {
    const pool = await chain.getPool().catch(() => null);
    res.json({
      chainId: chain.CHAIN_ID,
      chainName: "Monad Testnet",
      rpcUrl: chain.RPC_URL,
      explorerUrl: chain.EXPLORER_URL,
      faucetUrl: "https://faucet.monad.xyz",
      contractAddress: chain.CONTRACT_ADDRESS,
      dailyStake: "0.1",
      reward: "0.05",
      examFee: "0.05",
      rewardPool: pool ? formatEther(BigInt(pool)) : null,
      lessonsPerDay: LESSONS_PER_DAY,
      abi: chain.abi,
      duel: {
        address: games.duel.address || null,
        stake: "0.5",
        payout: "0.99",
        abi: games.duel.abi,
      },
      practice: { address: games.practice.address || null, abi: games.practice.abi },
      streakRewards: { address: achievements.streak.address || null },
      badges: { address: achievements.badges.address || null },
      duelsPerDay: achievements.DUELS_PER_DAY,
    });
  })
);

app.get("/api/english-lessons", (_req, res) => {
  res.json(lessonsForDay());
});

app.post(
  "/api/sync-progress",
  wrap(async (req, res) => {
    const { walletAddress, lessonId, score } = req.body || {};
    if (!isAddress(walletAddress || ""))
      return res.status(400).json({ success: false, message: "Invalid walletAddress" });
    const todays = lessonsForDay();
    if (!todays.some((l) => l.id === Number(lessonId))) {
      return res
        .status(400)
        .json({ success: false, message: "lessonId is not part of today's lessons" });
    }
    const s = Number(score);
    if (!Number.isInteger(s) || s < 0 || s > 100) {
      return res.status(400).json({ success: false, message: "score must be an integer 0-100" });
    }

    const address = getAddress(walletAddress);
    const day = today();
    console.log(`[progress] ${address} lesson=${lessonId} score=${s} day=${day}`);

    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      update: {},
      create: { walletAddress: address },
    });
    const existing = await prisma.progress.findUnique({
      where: { userId_lessonId_day: { userId: user.id, lessonId: Number(lessonId), day } },
    });
    await prisma.progress.upsert({
      where: { userId_lessonId_day: { userId: user.id, lessonId: Number(lessonId), day } },
      update: { score: s },
      create: { userId: user.id, lessonId: Number(lessonId), score: s, day },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalScore: { increment: s - (existing?.score ?? 0) },
        lessonsCompleted: existing ? undefined : { increment: 1 },
      },
    });

    const done = await prisma.progress.count({ where: { userId: user.id, day, score: { gt: 0 } } });
    const completedToday = done >= LESSONS_PER_DAY;

    let signature = null;
    let claimError = null;
    if (completedToday) {
      ({ signature, claimError } = await issueSignature(address));
    }

    res.json({
      success: true,
      message: "Progress synced",
      lessonsDoneToday: done,
      lessonsPerDay: LESSONS_PER_DAY,
      completedToday,
      signature,
      claimError,
    });
  })
);

/** Re-issue the completion signature (e.g. user staked after finishing lessons). */
app.post(
  "/api/claim-signature",
  wrap(async (req, res) => {
    const { walletAddress } = req.body || {};
    if (!isAddress(walletAddress || ""))
      return res.status(400).json({ success: false, message: "Invalid walletAddress" });
    const address = getAddress(walletAddress);
    const user = await prisma.user.findUnique({ where: { walletAddress: address } });
    const done = user
      ? await prisma.progress.count({ where: { userId: user.id, day: today(), score: { gt: 0 } } })
      : 0;
    if (done < LESSONS_PER_DAY) {
      return res.status(403).json({
        success: false,
        message: `Finish today's lessons first (${done}/${LESSONS_PER_DAY})`,
      });
    }
    const { signature, claimError } = await issueSignature(address);
    if (!signature) return res.status(409).json({ success: false, message: claimError });
    res.json({ success: true, signature });
  })
);

/** One reward per UTC day; re-signing the same stake is allowed so a failed tx can be retried. */
async function issueSignature(address) {
  if (!chain.ready() || !chain.verifier)
    return { signature: null, claimError: "Contract/verifier not configured" };
  const onchain = await chain.getOnchainUser(address);
  if (!onchain.active)
    return {
      signature: null,
      claimError: "No active stake: call startStreak() with 0.1 MON first",
    };
  const user = await prisma.user.findUnique({ where: { walletAddress: address } });
  const day = today();
  if (user.lastSignedDay === day && user.lastSignedStake !== onchain.stakedAt) {
    return { signature: null, claimError: "Today's reward already claimed. Come back tomorrow!" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSignedDay: day, lastSignedStake: onchain.stakedAt },
  });
  return { signature: await chain.signCompletion(address), claimError: null };
}

// Served exam per wallet, so grading only counts the questions this user actually got.
const examSessions = new Map(); // address -> { ids, at }

app.get("/api/level-test", (req, res) => {
  const questions = levelTest.drawExam();
  const address = req.query.address;
  if (isAddress(address || ""))
    examSessions.set(getAddress(address), { ids: questions.map((q) => q.id), at: Date.now() });
  res.json({ fee: "0.05", questions });
});

/** Body: { walletAddress, answers: { [questionId]: "chosen option" } } */
app.post(
  "/api/level-test/submit",
  wrap(async (req, res) => {
    const { walletAddress, answers } = req.body || {};
    if (!isAddress(walletAddress || ""))
      return res.status(400).json({ success: false, message: "Invalid walletAddress" });
    if (!answers || typeof answers !== "object")
      return res.status(400).json({ success: false, message: "answers object required" });
    const address = getAddress(walletAddress);
    const session = examSessions.get(address);
    if (!session)
      return res
        .status(400)
        .json({ success: false, message: "Start the test first (GET /api/level-test?address=…)" });
    examSessions.delete(address);
    const result = levelTest.grade(session.ids, answers);

    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      update: {},
      create: { walletAddress: address },
    });
    await prisma.levelTest.create({
      data: { userId: user.id, correct: result.correct, level: result.level },
    });
    console.log(`[level-test] ${address} ${result.correct}/${result.total} -> ${result.levelName}`);

    let signature = null;
    let claimError = null;
    if (!chain.ready() || !chain.verifier) claimError = "Contract/verifier not configured";
    else {
      const onchain = await chain.getOnchainUser(address);
      if (!onchain.examPaid)
        claimError = "Exam fee not paid: call startLevelTest() with 0.05 MON first";
      else signature = await chain.signExam(address, result.level);
    }
    res.json({ success: true, ...result, signature, claimError });
  })
);

app.get(
  "/api/users/:address",
  wrap(async (req, res) => {
    if (!isAddress(req.params.address))
      return res.status(400).json({ success: false, message: "Invalid address" });
    const address = getAddress(req.params.address);
    const user = await prisma.user.findUnique({ where: { walletAddress: address } });
    const todayProgress = user
      ? await prisma.progress.findMany({
          where: { userId: user.id, day: today() },
          select: { lessonId: true, score: true },
        })
      : [];
    const onchain = await chain.getOnchainUser(address).catch(() => null);
    res.json({
      walletAddress: address,
      totalScore: user?.totalScore ?? 0,
      lessonsCompleted: user?.lessonsCompleted ?? 0,
      todayProgress,
      completedToday: todayProgress.filter((p) => p.score > 0).length >= LESSONS_PER_DAY,
      rewardSignedToday: user?.lastSignedDay === today(),
      onchain,
    });
  })
);

app.get(
  "/api/certificates/:address",
  wrap(async (req, res) => {
    if (!isAddress(req.params.address))
      return res.status(400).json({ success: false, message: "Invalid address" });
    res.json(await chain.getCertificates(getAddress(req.params.address)));
  })
);

/** Public verification: anyone can check a certificate by token id. */
app.get(
  "/api/certificate/:tokenId",
  wrap(async (req, res) => {
    const id = Number(req.params.tokenId);
    if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ success: false, message: "Invalid token id" });
    try {
      res.json({ valid: true, ...(await chain.getCertificate(id)) });
    } catch {
      res.status(404).json({ valid: false, message: "Certificate not found on-chain" });
    }
  })
);

app.use("/api/practice", practiceRouter(prisma));
app.use("/api", achievements.achievementsRouter(prisma));

app.get(
  "/api/duels/:address",
  wrap(async (req, res) => {
    if (!isAddress(req.params.address))
      return res.status(400).json({ success: false, message: "Invalid address" });
    const a = getAddress(req.params.address);
    const rows = await prisma.duelResult.findMany({
      where: { OR: [{ p1: a }, { p2: a }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const wins = rows.filter((r) => r.winner === a).length;
    const draws = rows.filter((r) => !r.winner).length;
    const [streaks, today] = await Promise.all([
      achievements.duelWinStreaks(prisma, a),
      achievements.duelsToday(prisma, a),
    ]);
    res.json({
      played: rows.length,
      wins,
      draws,
      losses: rows.length - wins - draws,
      winStreak: streaks.current,
      bestWinStreak: streaks.best,
      todayPlayed: today,
      dailyLimit: achievements.DUELS_PER_DAY,
      recent: rows.slice(0, 5),
    });
  })
);

app.get(
  "/api/leaderboard",
  wrap(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: [{ totalScore: "desc" }, { lessonsCompleted: "desc" }],
      take: 20,
      select: { walletAddress: true, totalScore: true, lessonsCompleted: true },
    });
    res.json(users);
  })
);

app.use((_req, res) => res.status(404).json({ success: false, message: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

if (require.main === module) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    attachDuelServer(server, prisma);
    console.log(
      `Moningo API on :${PORT} | contract=${chain.CONTRACT_ADDRESS || "not deployed"} | verifier=${chain.verifier?.address || "missing"}`
    );
  });
}

module.exports = app;
