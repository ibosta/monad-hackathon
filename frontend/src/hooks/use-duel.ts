"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, type PracticeQuestion } from "@/lib/api";

export type DuelPhase =
  | "connecting"
  | "idle"
  | "searching"
  | "matched"
  | "countdown"
  | "question"
  | "reveal"
  | "settling"
  | "result"
  | "cancelled";

export type Match = {
  matchId: `0x${string}`;
  nonce: `0x${string}`;
  opponent: `0x${string}`;
  vsBot: boolean;
  stake: string;
  contract: `0x${string}`;
  joinDeadline: number;
  joined: string[];
};

export type Reveal = {
  i: number;
  answer: string;
  you: { option: string | null; correct: boolean; points: number };
  opponent: { correct: boolean; points: number };
};

export type DuelState = {
  phase: DuelPhase;
  online: number;
  match: Match | null;
  question: { i: number; total: number; q: PracticeQuestion; endsAt: number } | null;
  myAnswer: string | null;
  opponentAnswered: boolean;
  reveal: Reveal | null;
  scores: Record<string, number>;
  result: {
    winner: string | null;
    draw: boolean;
    payout: string;
    txHash: `0x${string}` | null;
  } | null;
  cancelReason: string | null;
  error: string | null;
};

const initial: DuelState = {
  phase: "connecting",
  online: 0,
  match: null,
  question: null,
  myAnswer: null,
  opponentAnswered: false,
  reveal: null,
  scores: {},
  result: null,
  cancelReason: null,
  error: null,
};

/** WebSocket client for real-time duels; reconnects automatically and resumes a running match. */
export function useDuel(address?: `0x${string}`) {
  const [state, setState] = useState<DuelState>(initial);
  const ws = useRef<WebSocket | null>(null);
  const clockSkew = useRef(0);
  const patch = (p: Partial<DuelState> | ((s: DuelState) => Partial<DuelState>)) =>
    setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));

  useEffect(() => {
    if (!address) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      const sock = new WebSocket(WS_URL());
      ws.current = sock;
      sock.onopen = () => sock.send(JSON.stringify({ t: "hello", address }));
      sock.onclose = () => {
        if (!closed) {
          patch({ phase: "connecting" });
          retry = setTimeout(connect, 1500);
        }
      };
      sock.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        switch (m.t) {
          case "welcome":
            patch((s) => ({
              online: m.online,
              phase: s.phase === "connecting" ? "idle" : s.phase,
            }));
            if (m.inMatch) sock.send(JSON.stringify({ t: "queue" })); // server re-sends the running match
            break;
          case "queued":
            patch({ phase: "searching" });
            break;
          case "matched":
            patch({
              phase: "matched",
              match: m,
              result: null,
              reveal: null,
              scores: {},
              cancelReason: null,
            });
            break;
          case "joined":
            patch((s) =>
              s.match
                ? { match: { ...s.match, joined: [...new Set([...s.match.joined, m.player])] } }
                : {}
            );
            break;
          case "start":
            patch({ phase: "countdown" });
            break;
          case "question":
            clockSkew.current = m.serverNow - Date.now();
            patch({
              phase: "question",
              question: { i: m.i, total: m.total, q: m.q, endsAt: m.endsAt - clockSkew.current },
              myAnswer: null,
              opponentAnswered: false,
              reveal: null,
            });
            break;
          case "opponent_answered":
            patch({ opponentAnswered: true });
            break;
          case "reveal":
            patch({ phase: "reveal", reveal: m, scores: m.scores });
            break;
          case "settling":
            patch({ phase: "settling", scores: m.scores });
            break;
          case "result":
            patch({ phase: "result", scores: m.scores, result: m });
            break;
          case "cancelled":
            patch({ phase: "cancelled", cancelReason: m.reason });
            break;
          case "error":
            patch({ error: m.message });
            break;
        }
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws.current?.close();
    };
  }, [address]);

  const sendMsg = useCallback(
    (m: object) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(m)),
    []
  );

  return {
    state,
    findOpponent: () => sendMsg({ t: "queue" }),
    playBot: () => sendMsg({ t: "bot" }),
    leave: () => {
      sendMsg({ t: "leave" });
      patch({ phase: "idle" });
    },
    answer: (option: string) => {
      if (!state.question || state.myAnswer) return;
      patch({ myAnswer: option });
      sendMsg({ t: "answer", i: state.question.i, option });
    },
    reset: () => patch({ ...initial, phase: "idle", online: state.online }),
  };
}
