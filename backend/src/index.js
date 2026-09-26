const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { isAddress, getAddress, formatEther } = require("viem");
const chain = require("./chain");
const { lessonsForDay, today, LESSONS_PER_DAY } = require("./lessons");
const levelTest = require("./level-test");

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 5000;

const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "100kb" }));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, contract: chain.CONTRACT_ADDRESS, verifier: chain.verifier?.address ?? null });
});

app.get("/api/config", wrap(async (_req, res) => {
  const pool = await chain.getPool().catch(() => null);
  res.json({
    chainId: chain.CHAIN_ID,
    chainName: "Monad Testnet",
    rpcUrl: chain.RPC_URL,
    explorerUrl: chain.EXPLORER_URL,
    faucetUrl: "https://faucet.monad.xyz",
    contractAddress: chain.CONTRACT_ADDRESS,
    dailyStake: "0.1",
    reward: "0.01",
    examFee: "0.05",
    rewardPool: pool ? formatEther(BigInt(pool)) : null,
    lessonsPerDay: LESSONS_PER_DAY,
    abi: chain.abi,
  });
}));

app.get("/api/english-lessons", (_req, res) => {
  res.json(lessonsForDay());
});

app.post("/api/sync-progress", wrap(async (req, res) => {
  const { walletAddress, lessonId, score } = req.body || {};
  if (!isAddress(walletAddress || "")) return res.status(400).json({ success: false, message: "Invalid walletAddress" });
  const todays = lessonsForDay();
  if (!todays.some((l) => l.id === Number(lessonId))) {
    return res.status(400).json({ success: false, message: "lessonId is not part of today's lessons" });
  }
  const s = Number(score);
  if (!Number.isInteger(s) || s < 0 || s > 100) {
    return res.status(400).json({ success: false, message: "score must be an integer 0-100" });
  }

  const address = getAddress(walletAddress);
  const day = today();
  console.log(`[progress] ${address} lesson=${lessonId} score=${s} day=${day}`);

  const user = await prisma.user.upsert({ where: { walletAddress: address }, update: {}, create: { walletAddress: address } });
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
}));

/** Re-issue the completion signature (e.g. user staked after finishing lessons). */
app.post("/api/claim-signature", wrap(async (req, res) => {
  const { walletAddress } = req.body || {};
  if (!isAddress(walletAddress || "")) return res.status(400).json({ success: false, message: "Invalid walletAddress" });
  const address = getAddress(walletAddress);
  const user = await prisma.user.findUnique({ where: { walletAddress: address } });
  const done = user ? await prisma.progress.count({ where: { userId: user.id, day: today(), score: { gt: 0 } } }) : 0;
  if (done < LESSONS_PER_DAY) {
    return res.status(403).json({ success: false, message: `Finish today's lessons first (${done}/${LESSONS_PER_DAY})` });
  }
  const { signature, claimError } = await issueSignature(address);
  if (!signature) return res.status(409).json({ success: false, message: claimError });
  res.json({ success: true, signature });
}));

async function issueSignature(address) {
  if (!chain.ready() || !chain.verifier) return { signature: null, claimError: "Contract/verifier not configured" };
  const onchain = await chain.getOnchainUser(address);
  if (!onchain.active) return { signature: null, claimError: "No active stake: call startStreak() with 0.1 MON first" };
  return { signature: await chain.signCompletion(address), claimError: null };
}

app.get("/api/level-test", (_req, res) => {
  res.json({ fee: "0.05", questions: levelTest.publicQuestions() });
});

/** Body: { walletAddress, answers: { [questionId]: "chosen option" } } */
app.post("/api/level-test/submit", wrap(async (req, res) => {
  const { walletAddress, answers } = req.body || {};
  if (!isAddress(walletAddress || "")) return res.status(400).json({ success: false, message: "Invalid walletAddress" });
  if (!answers || typeof answers !== "object") return res.status(400).json({ success: false, message: "answers object required" });
  const address = getAddress(walletAddress);
  const result = levelTest.grade(answers);

  const user = await prisma.user.upsert({ where: { walletAddress: address }, update: {}, create: { walletAddress: address } });
  await prisma.levelTest.create({ data: { userId: user.id, correct: result.correct, level: result.level } });
  console.log(`[level-test] ${address} ${result.correct}/${result.total} -> ${result.levelName}`);

  let signature = null;
  let claimError = null;
  if (!chain.ready() || !chain.verifier) claimError = "Contract/verifier not configured";
  else {
    const onchain = await chain.getOnchainUser(address);
    if (!onchain.examPaid) claimError = "Exam fee not paid: call startLevelTest() with 0.05 MON first";
    else signature = await chain.signExam(address, result.level);
  }
  res.json({ success: true, ...result, signature, claimError });
}));

app.get("/api/users/:address", wrap(async (req, res) => {
  if (!isAddress(req.params.address)) return res.status(400).json({ success: false, message: "Invalid address" });
  const address = getAddress(req.params.address);
  const user = await prisma.user.findUnique({ where: { walletAddress: address } });
  const todayProgress = user
    ? await prisma.progress.findMany({ where: { userId: user.id, day: today() }, select: { lessonId: true, score: true } })
    : [];
  const onchain = await chain.getOnchainUser(address).catch(() => null);
  res.json({
    walletAddress: address,
    totalScore: user?.totalScore ?? 0,
    lessonsCompleted: user?.lessonsCompleted ?? 0,
    todayProgress,
    completedToday: todayProgress.filter((p) => p.score > 0).length >= LESSONS_PER_DAY,
    onchain,
  });
}));

app.get("/api/leaderboard", wrap(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: [{ totalScore: "desc" }, { lessonsCompleted: "desc" }],
    take: 20,
    select: { walletAddress: true, totalScore: true, lessonsCompleted: true },
  });
  res.json(users);
}));

app.use((_req, res) => res.status(404).json({ success: false, message: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Moningo API on :${PORT} | contract=${chain.CONTRACT_ADDRESS || "not deployed"} | verifier=${chain.verifier?.address || "missing"}`);
  });
}

module.exports = app;
