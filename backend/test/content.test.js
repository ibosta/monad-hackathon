const { test } = require("node:test");
const assert = require("node:assert/strict");
const { POOL, lessonsForDay, LESSONS_PER_DAY } = require("../src/lessons");
const { QUESTIONS, drawExam, grade } = require("../src/level-test");
const {
  energyNow,
  questionsForLevel,
  MAX_ENERGY,
  REGEN_MS,
  TOTAL_LEVELS,
} = require("../src/practice");

test("lesson pool: unique ids and every answer is one of the options", () => {
  assert.equal(new Set(POOL.map((q) => q.id)).size, POOL.length);
  for (const q of POOL) assert.ok(q.options.includes(q.answer), `lesson ${q.id}`);
  for (const q of POOL.filter((l) => l.type === "listening"))
    assert.ok(q.speak, `listening ${q.id} needs speak text`);
});

test("daily lessons are deterministic per day and use distinct question types", () => {
  const a = lessonsForDay("2026-09-26");
  assert.deepEqual(a, lessonsForDay("2026-09-26"));
  assert.equal(a.length, LESSONS_PER_DAY);
  assert.equal(new Set(a.map((l) => l.type)).size, LESSONS_PER_DAY);
  assert.notDeepEqual(
    a.map((l) => l.id),
    lessonsForDay("2026-09-27").map((l) => l.id)
  );
});

test("exam: 2 questions per CEFR level, answers never leave the server", () => {
  const exam = drawExam();
  assert.equal(exam.length, 10);
  for (let level = 1; level <= 5; level++)
    assert.equal(exam.filter((q) => q.level === level).length, 2);
  for (const q of exam) assert.equal("answer" in q, false);
  for (const q of QUESTIONS) assert.ok(q.options.includes(q.answer), `exam ${q.id}`);
});

test("exam grading maps correct answers onto CEFR bands", () => {
  const ids = drawExam().map((q) => q.id);
  const key = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.answer]));
  const answersFor = (n) => Object.fromEntries(ids.slice(0, n).map((id) => [id, key[id]]));
  const band = (n) => grade(ids, answersFor(n)).levelName;
  assert.equal(band(0), "A1");
  assert.equal(band(2), "A1");
  assert.equal(band(3), "A2");
  assert.equal(band(5), "B1");
  assert.equal(band(7), "B2");
  assert.equal(band(10), "C1");
  // answers for questions that were not served are ignored
  assert.equal(grade(ids.slice(0, 5), answersFor(10)).correct, 5);
});

test("energy regenerates 1 per 15 minutes and caps at the max", () => {
  const now = Date.now();
  const at = (energy, msAgo) => energyNow({ energy, energyUpdatedAt: new Date(now - msAgo) }, now);
  assert.equal(at(3, 0).energy, 3);
  assert.equal(at(3, REGEN_MS - 1).energy, 3);
  assert.equal(at(3, REGEN_MS).energy, 4);
  assert.equal(at(3, REGEN_MS * 2.5).energy, 5);
  assert.equal(at(3, REGEN_MS * 2.5).nextAt, now - REGEN_MS * 2.5 + REGEN_MS * 3);
  assert.equal(at(9, REGEN_MS * 50).energy, MAX_ENERGY);
  assert.equal(at(9, REGEN_MS * 50).nextAt, null);
  assert.equal(at(15, REGEN_MS * 50).energy, 15, "purchased energy above max is kept");
});

test("practice levels have stable, valid questions", () => {
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const qs = questionsForLevel(level);
    assert.equal(qs.length, 3);
    assert.equal(new Set(qs.map((q) => q.id)).size, 3);
    for (const q of qs) assert.ok(q.options.includes(q.answer));
  }
  assert.deepEqual(questionsForLevel(7), questionsForLevel(7));
});

test("backend reward tiers mirror Moningo.rewardFor", () => {
  const { dailyRewardAt } = require("../src/achievements");
  const cases = [
    [1, "0.005"],
    [6, "0.005"],
    [7, "0.01"],
    [30, "0.015"],
    [100, "0.02"],
    [365, "0.025"],
    [1000, "0.03"],
  ];
  for (const [streak, reward] of cases) assert.equal(dailyRewardAt(streak), reward);
});
