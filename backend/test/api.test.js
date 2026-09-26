// HTTP API tests against a throwaway SQLite DB with on-chain reads disabled.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execSync } = require("child_process");

const dbFile = path.join(os.tmpdir(), `moningo-test-${process.pid}.db`);
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.CHAIN_OFFLINE = "1";
delete process.env.VERIFIER_PRIVATE_KEY;

let server;
let base;
const WALLET = "0x1111111111111111111111111111111111111111";

const get = (p) => fetch(base + p).then(async (r) => ({ status: r.status, body: await r.json() }));
const post = (p, data) =>
  fetch(base + p, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

before(async () => {
  execSync("npx prisma db push --skip-generate", {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: "ignore",
  });
  const app = require("../src/index.js");
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  fs.rmSync(dbFile, { force: true });
});

test("health and config", async () => {
  const h = await get("/api/health");
  assert.equal(h.status, 200);
  assert.equal(h.body.ok, true);
  const c = await get("/api/config");
  assert.equal(c.body.chainId, 10143);
  assert.equal(c.body.dailyStake, "0.1");
  assert.ok(Array.isArray(c.body.abi));
});

test("lessons endpoint serves today's 3 lessons", async () => {
  const r = await get("/api/english-lessons");
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 3);
});

test("sync-progress validates input and tracks today's progress", async () => {
  assert.equal(
    (await post("/api/sync-progress", { walletAddress: "nope", lessonId: 1, score: 1 })).status,
    400
  );
  const lessons = (await get("/api/english-lessons")).body;
  assert.equal(
    (await post("/api/sync-progress", { walletAddress: WALLET, lessonId: 99999, score: 1 })).status,
    400
  );
  assert.equal(
    (
      await post("/api/sync-progress", {
        walletAddress: WALLET,
        lessonId: lessons[0].id,
        score: 101,
      })
    ).status,
    400
  );

  let r;
  for (const l of lessons)
    r = await post("/api/sync-progress", { walletAddress: WALLET, lessonId: l.id, score: 100 });
  assert.equal(r.body.success, true);
  assert.equal(r.body.lessonsDoneToday, 3);
  assert.equal(r.body.completedToday, true);
  assert.equal(r.body.signature, null, "no signature without a configured verifier/contract");

  const u = await get(`/api/users/${WALLET}`);
  assert.equal(u.body.totalScore, 300);
  assert.equal(u.body.completedToday, true);
  const board = await get("/api/leaderboard");
  assert.equal(board.body[0].walletAddress, WALLET);
});

test("level test grades only the questions served to that wallet", async () => {
  assert.equal(
    (await post("/api/level-test/submit", { walletAddress: WALLET, answers: {} })).status,
    400
  );
  const exam = (await get(`/api/level-test?address=${WALLET}`)).body;
  assert.equal(exam.questions.length, 10);
  assert.ok(exam.questions.every((q) => !("answer" in q)));
  const r = await post("/api/level-test/submit", { walletAddress: WALLET, answers: {} });
  assert.equal(r.status, 200);
  assert.equal(r.body.levelName, "A1");
  assert.equal(
    (await post("/api/level-test/submit", { walletAddress: WALLET, answers: {} })).status,
    400,
    "session is single-use"
  );
});

test("practice: energy, locked levels, grading and progress", async () => {
  const st = (await get(`/api/practice/${WALLET}`)).body;
  assert.equal(st.energy, 10);
  assert.equal(st.level, 0);
  assert.equal((await post("/api/practice/start", { address: WALLET, level: 2 })).status, 400);

  const { questionsForLevel } = require("../src/practice");
  const key = Object.fromEntries(questionsForLevel(1).map((q) => [q.id, q.answer]));
  const s = await post("/api/practice/start", { address: WALLET, level: 1 });
  assert.equal(s.status, 200);
  assert.equal(s.body.energy, 9);
  assert.ok(s.body.questions.every((q) => !("answer" in q)));

  const [q1, q2, q3] = s.body.questions;
  assert.equal(
    (await post("/api/practice/answer", { address: WALLET, questionId: q1.id, option: key[q1.id] }))
      .body.correct,
    true
  );
  const wrong = await post("/api/practice/answer", {
    address: WALLET,
    questionId: q2.id,
    option: "__wrong__",
  });
  assert.equal(wrong.body.correct, false);
  assert.equal(wrong.body.answer, key[q2.id]);
  await post("/api/practice/answer", { address: WALLET, questionId: q2.id, option: key[q2.id] }); // retry doesn't count
  await post("/api/practice/answer", { address: WALLET, questionId: q3.id, option: key[q3.id] });
  const f = await post("/api/practice/finish", { address: WALLET });
  assert.deepEqual([f.body.passed, f.body.stars, f.body.correct], [true, 2, 2]);

  const after = (await get(`/api/practice/${WALLET}`)).body;
  assert.equal(after.level, 1);
  assert.equal(after.stars[1], 2);
  assert.equal(after.energy, 9);
});

test("practice: running out of energy returns 402", async () => {
  const W = "0x2222222222222222222222222222222222222222";
  for (let i = 0; i < 10; i++) {
    assert.equal((await post("/api/practice/start", { address: W, level: 1 })).status, 200);
    await post("/api/practice/finish", { address: W });
  }
  const r = await post("/api/practice/start", { address: W, level: 1 });
  assert.equal(r.status, 402);
  assert.equal(r.body.code, "NO_ENERGY");
});

test("duel stats and unknown routes", async () => {
  const d = await get(`/api/duels/${WALLET}`);
  assert.deepEqual([d.body.played, d.body.dailyLimit, d.body.todayPlayed], [0, 5, 0]);
  assert.equal((await get("/api/does-not-exist")).status, 404);
  assert.equal((await get("/api/users/not-an-address")).status, 400);
});
