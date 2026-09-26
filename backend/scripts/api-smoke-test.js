#!/usr/bin/env node
/*
 * Moningo Backend API smoke test tool.
 *
 * Runs against a live backend (local npm dev or Docker) and validates the public REST
 * contract without requiring Postman. The tool intentionally avoids mutating on-chain
 * state and accepts expected offline/unconfigured chain responses for signature/claim
 * endpoints.
 */
const assert = require("node:assert/strict");

const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000";
const DEFAULT_WALLET = process.env.TEST_WALLET || "0x1111111111111111111111111111111111111111";
const SECOND_WALLET = process.env.TEST_WALLET_2 || "0x2222222222222222222222222222222222222222";

const args = process.argv.slice(2);
const argValue = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const baseUrl = (argValue("--base-url") || DEFAULT_BASE_URL).replace(/\/$/, "");
const wallet = argValue("--wallet") || DEFAULT_WALLET;
const timeoutMs = Number(argValue("--timeout-ms") || process.env.API_TEST_TIMEOUT_MS || 10_000);

const state = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

function log(level, message) {
  const icon = level === "pass" ? "✓" : level === "fail" ? "✗" : level === "skip" ? "-" : "•";
  console.log(`${icon} ${message}`);
}

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${label} timed out`)), timeoutMs);
  return promise(controller.signal).finally(() => clearTimeout(timer));
}

async function request(method, path, body) {
  return withTimeout(async (signal) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`${method} ${path} returned non-JSON response: ${text.slice(0, 120)}`);
    }
    return { status: res.status, body: json };
  }, `${method} ${path}`);
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);

async function run(name, fn) {
  try {
    await fn();
    state.passed += 1;
    log("pass", name);
  } catch (err) {
    state.failed += 1;
    log("fail", name);
    console.error(err.stack || err.message || err);
  }
}

function skip(name, reason) {
  state.skipped += 1;
  log("skip", `${name} (${reason})`);
}

function assertStatus(actual, expected, label) {
  assert.equal(actual, expected, `${label} expected HTTP ${expected}, got ${actual}`);
}

function assertAnyStatus(actual, expected, label) {
  assert.ok(expected.includes(actual), `${label} expected HTTP ${expected.join("/")}, got ${actual}`);
}

async function healthAndConfig() {
  const health = await get("/api/health");
  assertStatus(health.status, 200, "health");
  assert.equal(health.body.ok, true);
  assert.ok("contract" in health.body);
  assert.ok("verifier" in health.body);

  const config = await get("/api/config");
  assertStatus(config.status, 200, "config");
  assert.equal(config.body.chainId, 10143);
  assert.equal(config.body.chainName, "Monad Testnet");
  assert.ok(Array.isArray(config.body.abi));
  assert.ok(Array.isArray(config.body.rewardTiers));
  assert.equal(typeof config.body.lessonsPerDay, "number");
  assert.ok(config.body.duel && Array.isArray(config.body.duel.abi));
  assert.ok(config.body.practice && Array.isArray(config.body.practice.abi));
}

async function lessonsAndProgress() {
  const lessons = await get("/api/english-lessons");
  assertStatus(lessons.status, 200, "lessons");
  assert.equal(lessons.body.length, 3);
  assert.ok(lessons.body.every((lesson) => lesson.id && lesson.question && Array.isArray(lesson.options)));

  const badWallet = await post("/api/sync-progress", {
    walletAddress: "not-a-wallet",
    lessonId: lessons.body[0].id,
    score: 100,
  });
  assertStatus(badWallet.status, 400, "sync-progress invalid wallet");

  const badLesson = await post("/api/sync-progress", {
    walletAddress: wallet,
    lessonId: 999999,
    score: 100,
  });
  assertStatus(badLesson.status, 400, "sync-progress invalid lesson");

  const badScore = await post("/api/sync-progress", {
    walletAddress: wallet,
    lessonId: lessons.body[0].id,
    score: 101,
  });
  assertStatus(badScore.status, 400, "sync-progress invalid score");

  let last;
  for (const lesson of lessons.body) {
    last = await post("/api/sync-progress", {
      walletAddress: wallet,
      lessonId: lesson.id,
      score: 100,
    });
    assertStatus(last.status, 200, `sync-progress lesson ${lesson.id}`);
    assert.equal(last.body.success, true);
  }

  assert.equal(last.body.completedToday, true);
  assert.equal(last.body.lessonsDoneToday, 3);
  assert.ok("signature" in last.body);
  assert.ok("claimError" in last.body);

  const user = await get(`/api/users/${wallet}`);
  assertStatus(user.status, 200, "user profile");
  assert.equal(user.body.completedToday, true);
  assert.ok(user.body.totalScore >= 300);
  assert.ok(Array.isArray(user.body.todayProgress));

  const leaderboard = await get("/api/leaderboard");
  assertStatus(leaderboard.status, 200, "leaderboard");
  assert.ok(Array.isArray(leaderboard.body));
  assert.ok(leaderboard.body.some((row) => row.walletAddress.toLowerCase() === wallet.toLowerCase()));
}

async function levelTestFlow() {
  const submitWithoutSession = await post("/api/level-test/submit", {
    walletAddress: SECOND_WALLET,
    answers: {},
  });
  assertStatus(submitWithoutSession.status, 400, "level-test submit without session");

  const exam = await get(`/api/level-test?address=${SECOND_WALLET}`);
  assertStatus(exam.status, 200, "level-test start");
  assert.equal(exam.body.fee, "0.05");
  assert.equal(exam.body.questions.length, 10);
  assert.ok(exam.body.questions.every((question) => !("answer" in question)));

  const submit = await post("/api/level-test/submit", {
    walletAddress: SECOND_WALLET,
    answers: {},
  });
  assertStatus(submit.status, 200, "level-test submit");
  assert.equal(submit.body.success, true);
  assert.equal(submit.body.levelName, "A1");
  assert.ok("signature" in submit.body);
  assert.ok("claimError" in submit.body);

  const duplicate = await post("/api/level-test/submit", {
    walletAddress: SECOND_WALLET,
    answers: {},
  });
  assertStatus(duplicate.status, 400, "level-test session is single-use");
}

async function practiceFlow() {
  const status = await get(`/api/practice/${wallet}`);
  assertStatus(status.status, 200, "practice status");
  assert.ok(status.body.energy >= 0);
  assert.equal(status.body.totalLevels, 50);
  assert.ok(Array.isArray(status.body.checkpoints));

  const locked = await post("/api/practice/start", { address: wallet, level: 50 });
  assertAnyStatus(locked.status, [400, 402], "practice locked/high level");

  if (status.body.energy < 1) {
    skip("practice playable level flow", "wallet has no energy; use a fresh TEST_WALLET or wait for regeneration");
    return;
  }

  const level = Math.min(status.body.level + 1, status.body.totalLevels);
  const started = await post("/api/practice/start", { address: wallet, level });
  assertStatus(started.status, 200, "practice start");
  assert.equal(started.body.level, level);
  assert.equal(started.body.questions.length, 3);
  assert.ok(started.body.questions.every((question) => !("answer" in question)));

  for (const question of started.body.questions) {
    const answer = await post("/api/practice/answer", {
      address: wallet,
      questionId: question.id,
      option: question.options[0],
    });
    assertStatus(answer.status, 200, `practice answer ${question.id}`);
    assert.equal(typeof answer.body.correct, "boolean");
    assert.equal(typeof answer.body.answer, "string");
  }

  const finish = await post("/api/practice/finish", { address: wallet });
  assertStatus(finish.status, 200, "practice finish");
  assert.equal(finish.body.total, 3);
  assert.equal(finish.body.level, level);
}

async function achievementsAndReadOnlyEndpoints() {
  const certificates = await get(`/api/certificates/${wallet}`);
  assertStatus(certificates.status, 200, "certificates list");
  assert.ok(Array.isArray(certificates.body));

  const invalidCertificate = await get("/api/certificate/0");
  assertStatus(invalidCertificate.status, 400, "invalid certificate id");

  const duelStats = await get(`/api/duels/${wallet}`);
  assertStatus(duelStats.status, 200, "duel stats");
  assert.equal(duelStats.body.dailyLimit, 5);
  assert.ok(Array.isArray(duelStats.body.recent));

  const streakTree = await get(`/api/streak-tree/${wallet}`);
  assertStatus(streakTree.status, 200, "streak tree");
  assert.ok(Array.isArray(streakTree.body.milestones));

  const badges = await get(`/api/badges/${wallet}`);
  assertStatus(badges.status, 200, "badges");
  assert.ok(Array.isArray(badges.body.badges));

  const missing = await get("/api/does-not-exist");
  assertStatus(missing.status, 404, "unknown route");

  const invalidUser = await get("/api/users/not-an-address");
  assertStatus(invalidUser.status, 400, "invalid user address");
}

async function claimValidation() {
  const invalid = await post("/api/daily/claim", { walletAddress: "nope" });
  assertStatus(invalid.status, 400, "daily claim invalid wallet");

  const claim = await post("/api/daily/claim", { walletAddress: wallet });
  assertAnyStatus(claim.status, [200, 403, 409, 502, 503], "daily claim graceful response");
  assert.notEqual(claim.status, 500, "daily claim must not return 500");

  const signature = await post("/api/claim-signature", { walletAddress: wallet });
  assertAnyStatus(signature.status, [200, 403, 409], "claim signature graceful response");
  assert.notEqual(signature.status, 500, "claim signature must not return 500");

  const invalidBadge = await post("/api/badges/signature", { address: wallet, id: 1 });
  assertStatus(invalidBadge.status, 400, "invalid badge signature request");

  const checkpoint = await post("/api/practice/checkpoint-signature", { address: wallet, level: 10 });
  assertAnyStatus(checkpoint.status, [400, 403, 200], "checkpoint signature graceful response");
  assert.notEqual(checkpoint.status, 500, "checkpoint signature must not return 500");
}

async function main() {
  console.log(`Moningo API smoke test: ${baseUrl}`);
  console.log(`Wallet: ${wallet}`);

  await run("health and config", healthAndConfig);
  await run("lessons and progress", lessonsAndProgress);
  await run("level test flow", levelTestFlow);
  await run("practice flow", practiceFlow);
  await run("achievements and read-only endpoints", achievementsAndReadOnlyEndpoints);
  await run("claim/signature validation", claimValidation);

  console.log(`\nResult: ${state.passed} passed, ${state.failed} failed, ${state.skipped} skipped`);
  if (state.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`Unable to run API smoke tests against ${baseUrl}`);
  console.error(err.stack || err.message || err);
  process.exit(1);
});
