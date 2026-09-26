// Real-time 1v1 duels over WebSocket. The server is authoritative for questions, timing and scores;
// stakes are escrowed in MoningoDuel and the server settles on-chain as referee.
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { isAddress, getAddress, formatEther, keccak256, encodePacked } = require("viem");
const { client } = require("./chain");
const { send, duel, account } = require("./signer");
const { POOL } = require("./lessons");
const { QUESTIONS: EXAM } = require("./level-test");

const ROUNDS = 5;
const QUESTION_MS = 12_000;
const REVEAL_MS = 2_500;
const JOIN_TIMEOUT_MS = 120_000;
const GAS = { join: 150_000n, settle: 150_000n, cancel: 120_000n };
const STAKE_WEI = 500_000_000_000_000_000n;

const BANK = [...POOL, ...EXAM.map((q) => ({ ...q, type: "grammar" }))];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function attachDuelServer(server, prisma) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const sockets = new Map(); // address -> ws
  let waiting = null; // address waiting for an opponent
  const matches = new Map(); // matchId -> match
  const byPlayer = new Map(); // address -> matchId

  const sendTo = (addr, msg) => {
    const ws = sockets.get(addr);
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };
  const broadcast = (m, msg) => m.players.forEach((p) => sendTo(p, msg));

  function createMatch(a, b, vsBot = false) {
    const nonce = `0x${crypto.randomBytes(32).toString("hex")}`;
    const [lo, hi] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
    const matchId = keccak256(encodePacked(["address", "address", "bytes32"], [lo, hi, nonce]));
    const m = {
      matchId,
      nonce,
      players: [a, b],
      vsBot,
      state: "joining",
      joined: new Set(),
      scores: { [a]: 0, [b]: 0 },
      questions: shuffle(BANK).slice(0, ROUNDS).map((q) => ({ ...q, options: shuffle(q.options) })),
      round: -1,
      answers: {},
      createdAt: Date.now(),
    };
    matches.set(matchId, m);
    for (const p of m.players) {
      byPlayer.set(p, matchId);
      const opponent = m.players.find((x) => x !== p);
      sendTo(p, {
        t: "matched",
        matchId,
        nonce,
        opponent,
        vsBot: vsBot && opponent === account?.address,
        stake: formatEther(STAKE_WEI),
        contract: duel.address,
        joinDeadline: Date.now() + JOIN_TIMEOUT_MS,
      });
    }
    watchJoins(m);
    if (vsBot) botJoin(m);
    return m;
  }

  async function botJoin(m) {
    const human = m.players.find((p) => p !== account.address);
    try {
      await send({ address: duel.address, abi: duel.abi, functionName: "join", args: [m.nonce, human], value: STAKE_WEI, gas: GAS.join });
    } catch (e) {
      console.error("[duel] bot join failed", e.shortMessage || e.message);
      endWithoutGame(m, "Mona could not join right now. Try matching with a human.");
    }
  }

  function watchJoins(m) {
    const timer = setInterval(async () => {
      if (m.state !== "joining") return clearInterval(timer);
      try {
        const [p1, p2] = await client.readContract({ address: duel.address, abi: duel.abi, functionName: "matches", args: [m.matchId] });
        const zero = "0x0000000000000000000000000000000000000000";
        const now = new Set([p1, p2].filter((x) => x !== zero).map(getAddress));
        for (const p of now) {
          if (!m.joined.has(p)) {
            m.joined.add(p);
            broadcast(m, { t: "joined", player: p, count: m.joined.size });
          }
        }
        if (m.joined.size === 2) {
          clearInterval(timer);
          startGame(m);
        } else if (Date.now() - m.createdAt > JOIN_TIMEOUT_MS) {
          clearInterval(timer);
          endWithoutGame(m, "Opponent didn't stake in time. Your stake is refunded.");
        }
      } catch (e) {
        console.error("[duel] poll", e.shortMessage || e.message);
      }
    }, 1500);
  }

  async function endWithoutGame(m, reason) {
    m.state = "cancelled";
    let txHash = null;
    if (m.joined.size > 0) {
      try {
        ({ hash: txHash } = await send({ address: duel.address, abi: duel.abi, functionName: "cancel", args: [m.matchId], gas: GAS.cancel }));
      } catch (e) {
        console.error("[duel] cancel failed", e.shortMessage || e.message);
      }
    }
    broadcast(m, { t: "cancelled", reason, txHash });
    cleanup(m);
  }

  function startGame(m) {
    m.state = "playing";
    broadcast(m, { t: "start", rounds: ROUNDS, secondsPerQuestion: QUESTION_MS / 1000 });
    setTimeout(() => nextRound(m), 3_000); // 3-2-1 countdown on the client
  }

  function nextRound(m) {
    m.round += 1;
    if (m.round >= ROUNDS) return finish(m);
    const q = m.questions[m.round];
    m.answers[m.round] = {};
    m.roundStart = Date.now();
    m.roundEnds = m.roundStart + QUESTION_MS;
    broadcast(m, {
      t: "question",
      i: m.round,
      total: ROUNDS,
      q: { id: q.id, type: q.type, question: q.question, options: q.options, speak: q.speak },
      endsAt: m.roundEnds,
      serverNow: Date.now(),
    });
    m.roundTimer = setTimeout(() => reveal(m), QUESTION_MS);
    if (m.vsBot) {
      const botDelay = 2_000 + crypto.randomInt(6_000);
      setTimeout(() => {
        const correct = crypto.randomInt(100) < 60;
        const option = correct ? q.answer : q.options.find((o) => o !== q.answer);
        answer(m, account.address, m.round, option);
      }, botDelay);
    }
  }

  function answer(m, player, i, option) {
    if (m.state !== "playing" || i !== m.round || !m.answers[i] || player in m.answers[i]) return;
    const q = m.questions[i];
    const remaining = Math.max(0, m.roundEnds - Date.now());
    const correct = option === q.answer;
    const points = correct ? 100 + Math.round((50 * remaining) / QUESTION_MS) : 0;
    m.answers[i][player] = { option, correct, points };
    m.scores[player] += points;
    const opponent = m.players.find((p) => p !== player);
    sendTo(opponent, { t: "opponent_answered", i });
    if (Object.keys(m.answers[i]).length === 2) {
      clearTimeout(m.roundTimer);
      reveal(m);
    }
  }

  function reveal(m) {
    if (m.state !== "playing" || m.revealed === m.round) return;
    m.revealed = m.round;
    const q = m.questions[m.round];
    for (const p of m.players) {
      const mine = m.answers[m.round][p];
      const opp = m.answers[m.round][m.players.find((x) => x !== p)];
      sendTo(p, {
        t: "reveal",
        i: m.round,
        answer: q.answer,
        you: mine ?? { option: null, correct: false, points: 0 },
        opponent: opp ? { correct: opp.correct, points: opp.points } : { correct: false, points: 0 },
        scores: m.scores,
      });
    }
    setTimeout(() => nextRound(m), REVEAL_MS);
  }

  async function finish(m) {
    m.state = "settling";
    const [a, b] = m.players;
    const winner = m.scores[a] === m.scores[b] ? null : m.scores[a] > m.scores[b] ? a : b;
    broadcast(m, { t: "settling", scores: m.scores, winner });
    let txHash = null;
    try {
      const zero = "0x0000000000000000000000000000000000000000";
      ({ hash: txHash } = await send({
        address: duel.address,
        abi: duel.abi,
        functionName: "settle",
        args: [m.matchId, winner ?? zero],
        gas: GAS.settle,
      }));
    } catch (e) {
      console.error("[duel] settle failed", e.shortMessage || e.message);
    }
    broadcast(m, { t: "result", winner, draw: !winner, scores: m.scores, payout: winner ? "0.99" : "0.5", txHash });
    await prisma.duelResult
      .create({ data: { matchId: m.matchId, p1: a, p2: b, winner, scoreP1: m.scores[a], scoreP2: m.scores[b], txHash, vsBot: m.vsBot } })
      .catch((e) => console.error("[duel] save", e.message));
    cleanup(m);
  }

  function cleanup(m) {
    m.state = m.state === "cancelled" ? "cancelled" : "done";
    for (const p of m.players) if (byPlayer.get(p) === m.matchId) byPlayer.delete(p);
    setTimeout(() => matches.delete(m.matchId), 60_000);
  }

  wss.on("connection", (ws) => {
    let me = null;
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.t === "hello") {
        if (!isAddress(msg.address || "")) return ws.send(JSON.stringify({ t: "error", message: "Invalid address" }));
        me = getAddress(msg.address);
        sockets.set(me, ws);
        const current = matches.get(byPlayer.get(me));
        ws.send(JSON.stringify({ t: "welcome", address: me, inMatch: Boolean(current), online: sockets.size }));
        return;
      }
      if (!me) return;
      if (msg.t === "queue") {
        if (byPlayer.has(me)) return;
        if (waiting && waiting !== me && sockets.get(waiting)?.readyState === ws.OPEN) {
          const other = waiting;
          waiting = null;
          createMatch(other, me);
        } else {
          waiting = me;
          ws.send(JSON.stringify({ t: "queued" }));
        }
      } else if (msg.t === "leave") {
        if (waiting === me) waiting = null;
      } else if (msg.t === "bot") {
        if (!account || !duel.address) return ws.send(JSON.stringify({ t: "error", message: "Bot unavailable" }));
        if (waiting === me) waiting = null;
        if (!byPlayer.has(me)) createMatch(me, account.address, true);
      } else if (msg.t === "answer") {
        const m = matches.get(byPlayer.get(me));
        if (m) answer(m, me, msg.i, msg.option);
      }
    });
    ws.on("close", () => {
      if (me && sockets.get(me) === ws) sockets.delete(me);
      if (waiting === me) waiting = null;
    });
  });

  // keep-alive so proxies don't drop idle sockets
  setInterval(() => wss.clients.forEach((c) => c.readyState === c.OPEN && c.ping()), 25_000);
  return wss;
}

module.exports = { attachDuelServer, STAKE_WEI };
