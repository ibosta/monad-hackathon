"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Lock, Star, Zap, Loader2, X, Gift, Check, Cloud, LocateFixed } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Modal } from "@/components/modal";
import { LoadError } from "@/components/load-error";
import { Confetti, spring } from "@/components/motion";
import { ActionBar, QuestionCard } from "@/components/question-card";
import { WalletButton } from "@/components/wallet-button";
import { api, type PracticeQuestion, type PracticeState } from "@/lib/api";
import { practiceAbi } from "@/lib/games-abi";
import { withTxToast } from "@/lib/tx-toast";
import { useChainTx, usePractice } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const GAS = { buyEnergy: 90_000n, claimCheckpoint: 130_000n };
const PACK_WEI = 10_000_000_000_000_000n;
const NODE_GAP = 104;
const FOG_AHEAD = 4; // how many hidden steps of road are drawn past the next level

type Play = {
  level: number;
  questions: PracticeQuestion[];
  index: number;
  selected: string | null;
  feedback: { correct: boolean; answer: string } | null;
  wrongPulse: number;
};
type Finish = {
  passed: boolean;
  stars: number;
  correct: number;
  total: number;
  level: number;
  checkpoint: number | null;
};

export default function PracticePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const qc = useQueryClient();
  const send = useChainTx();
  const { data: st, refetch, isError } = usePractice(address);
  const [play, setPlay] = useState<Play | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [noEnergy, setNoEnergy] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  if (!mounted) return null;
  if (!isConnected || !address) {
    return (
      <section className="metal-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <Mascot size={140} />
        <h1 className="metal-text text-3xl font-black">Connect to practice</h1>
        <WalletButton />
      </section>
    );
  }
  if (isError && !st) return <LoadError what="your practice map" onRetry={() => refetch()} />;
  if (!st) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-monad" />
      </div>
    );
  }

  const refresh = () =>
    Promise.all([refetch(), qc.invalidateQueries({ queryKey: ["practice", address] })]);

  const startLevel = async (level: number) => {
    setBusy(`level-${level}`);
    try {
      const r = await api.practiceStart(address, level);
      setPlay({
        level,
        questions: r.questions,
        index: 0,
        selected: null,
        feedback: null,
        wrongPulse: 0,
      });
      refresh();
    } catch (e) {
      if (e instanceof Error && /energy/i.test(e.message)) setNoEnergy(true);
    } finally {
      setBusy(null);
    }
  };

  const buyEnergy = async () => {
    if (!st.canBuy) return;
    setBusy("buy");
    try {
      const tx = await withTxToast(`Buy ${st.energyPerPack} ⚡ for ${st.packPrice} MON`, () =>
        send({
          address: st.contract as `0x${string}`,
          abi: practiceAbi,
          functionName: "buyEnergy",
          args: [1n],
          value: PACK_WEI,
          gas: GAS.buyEnergy,
        })
      );
      await api.creditEnergy(address, tx.hash);
      await refresh();
      setNoEnergy(false);
    } catch {
      /* surfaced by toast */
    } finally {
      setBusy(null);
    }
  };

  const claimCheckpoint = async (level: number) => {
    setBusy(`chest-${level}`);
    try {
      const { signature } = await api.checkpointSignature(address, level);
      const tx = await withTxToast(`Open level ${level} chest`, () =>
        send({
          address: st.contract as `0x${string}`,
          abi: practiceAbi,
          functionName: "claimCheckpoint",
          args: [BigInt(level), signature],
          gas: GAS.claimCheckpoint,
        })
      );
      setCelebrate(tx.hash);
      await refresh();
    } catch {
      /* surfaced by toast */
    } finally {
      setBusy(null);
    }
  };

  // ---------- Level in progress ----------
  if (play) {
    const q = play.questions[play.index];
    const last = play.index === play.questions.length - 1;
    const states: Record<string, string | undefined> = {};
    for (const o of q.options) {
      if (play.feedback)
        states[o] =
          o === play.feedback.answer ? "correct" : o === play.selected ? "wrong" : undefined;
      else if (o === play.selected) states[o] = "selected";
    }
    const check = async () => {
      if (!play.selected) return;
      const r = await api.practiceAnswer(address, q.id, play.selected);
      setPlay({
        ...play,
        feedback: r,
        wrongPulse: r.correct ? play.wrongPulse : play.wrongPulse + 1,
      });
    };
    const next = async () => {
      if (!last) return setPlay({ ...play, index: play.index + 1, selected: null, feedback: null });
      const f = await api.practiceFinish(address);
      setPlay(null);
      setFinish(f);
      refresh();
    };
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => setConfirmQuit(true)}
            aria-label="Quit"
            className="text-monad-300 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-monad-900">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-monad to-berry-400"
              animate={{
                width: `${((play.index + (play.feedback ? 1 : 0)) / play.questions.length) * 100}%`,
              }}
              transition={spring}
            />
          </div>
          <span className="font-black text-monad-200">Lv {play.level}</span>
        </div>
        <QuestionCard
          q={q}
          mood={play.feedback ? (play.feedback.correct ? "cheer" : "sad") : "think"}
          states={states}
          disabled={Boolean(play.feedback)}
          onSelect={(o) => setPlay({ ...play, selected: o })}
          wrongPulse={play.wrongPulse}
        />
        <div className="flex-1" />
        <ActionBar
          feedback={
            play.feedback && {
              correct: play.feedback.correct,
              text: play.feedback.correct ? "Correct! ✨" : `Answer: ${play.feedback.answer}`,
            }
          }
        >
          {play.feedback ? (
            <button
              onClick={next}
              className={cn("w-full", play.feedback.correct ? "btn-green" : "btn-berry")}
            >
              {last ? "Finish level" : "Continue"}
            </button>
          ) : (
            <button onClick={check} disabled={!play.selected} className="btn-green w-full">
              Check
            </button>
          )}
        </ActionBar>

        <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)}>
          <Mascot size={96} mood="sad" />
          <h2 className="metal-text text-2xl font-black">Leave level {play.level}?</h2>
          <p className="text-monad-100/85">
            The <b className="text-yellow-300">1 ⚡</b> you spent to start this level won&apos;t
            come back, and your answers so far will be lost.
          </p>
          <button onClick={() => setConfirmQuit(false)} className="btn-green w-full">
            Keep playing
          </button>
          <button
            onClick={() => {
              setConfirmQuit(false);
              setPlay(null);
            }}
            className="btn-berry w-full"
          >
            Leave and lose 1 ⚡
          </button>
        </Modal>
      </div>
    );
  }

  const nextLevel = finish ? (finish.passed ? finish.level + 1 : finish.level) : 0;

  return (
    <div className="mx-auto max-w-xl">
      <Confetti fire={celebrate} />
      <EnergyBar st={st} onBuy={buyEnergy} buying={busy === "buy"} />
      <LevelMap st={st} busy={busy} onPlay={startLevel} onChest={claimCheckpoint} />

      {/* Level result */}
      <Modal open={Boolean(finish)} onClose={() => setFinish(null)}>
        {finish && (
          <>
            <Confetti
              fire={finish.passed ? `lvl-${finish.level}-${finish.stars}` : null}
              count={40}
            />
            <Mascot size={110} mood={finish.passed ? "cheer" : "sad"} />
            <h2 className="metal-text text-2xl font-black sm:text-3xl">
              {finish.passed ? `Level ${finish.level} complete!` : "Almost there!"}
            </h2>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -120 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 12,
                    delay: 0.25 + i * 0.18,
                  }}
                >
                  <Star
                    className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12",
                      i <= finish.stars
                        ? "fill-yellow-300 text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.7)]"
                        : "text-monad-700"
                    )}
                  />
                </motion.span>
              ))}
            </div>
            <p className="text-monad-100">
              {finish.correct}/{finish.total} correct on first try
              {finish.passed ? "" : ". You need 2 to pass."}
            </p>
            {finish.checkpoint && (
              <button
                onClick={() => {
                  const cp = finish.checkpoint!;
                  setFinish(null);
                  claimCheckpoint(cp);
                }}
                className="btn-berry w-full"
              >
                <Gift className="h-5 w-5" /> Open chest: +{st.checkpointReward} MON
              </button>
            )}
            {nextLevel <= st.totalLevels && (
              <button
                onClick={() => {
                  setFinish(null);
                  startLevel(nextLevel);
                }}
                className="btn-green w-full"
              >
                {finish.passed ? "Next level (1 ⚡)" : "Try again (1 ⚡)"}
              </button>
            )}
            <button
              onClick={() => setFinish(null)}
              className="text-sm font-bold text-monad-300 hover:text-white"
            >
              Back to map
            </button>
          </>
        )}
      </Modal>

      {/* Out of energy */}
      <Modal open={noEnergy} onClose={() => setNoEnergy(false)}>
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Zap className="h-14 w-14 fill-yellow-300 text-yellow-300" />
        </motion.div>
        <h2 className="metal-text text-2xl font-black sm:text-3xl">Out of energy</h2>
        <p className="text-monad-100/80">
          Energy refills 1 every {st.regenMinutes} min (up to {st.maxEnergy}). Or keep going now:{" "}
          {st.energyPerPack} ⚡ for {st.packPrice} MON.
        </p>
        <NextEnergy at={st.nextEnergyAt} />
        <button
          onClick={buyEnergy}
          disabled={busy === "buy" || !st.canBuy}
          className="btn-monad w-full"
        >
          {busy === "buy" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Zap className="h-5 w-5" />
          )}{" "}
          Buy {st.energyPerPack} ⚡ · {st.packPrice} MON
        </button>
      </Modal>
    </div>
  );
}

function EnergyBar({
  st,
  onBuy,
  buying,
}: {
  st: PracticeState;
  onBuy: () => void;
  buying: boolean;
}) {
  const bonus = Math.max(0, st.energy - st.maxEnergy);
  const bonusSlots = st.maxBankedEnergy - st.maxEnergy;
  return (
    <div className="metal-card sticky top-[4.5rem] z-30 mb-6 space-y-2 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-0.5 sm:gap-1">
            {Array.from({ length: st.maxEnergy }, (_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring, delay: i * 0.03 }}
              >
                <Zap
                  className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    i < Math.min(st.energy, st.maxEnergy)
                      ? "fill-yellow-300 text-yellow-300"
                      : "text-monad-700"
                  )}
                />
              </motion.span>
            ))}
          </div>
          <p className="mt-1 text-[11px] font-bold text-monad-300 sm:text-xs">
            {st.energy >= st.maxEnergy ? "Energy full" : <NextEnergy at={st.nextEnergyAt} inline />}
          </p>
        </div>
        <button
          onClick={onBuy}
          disabled={buying || !st.canBuy}
          title={st.canBuy ? undefined : `Energy cap is ${st.maxBankedEnergy}`}
          className="btn-ghost-3d shrink-0 px-3 py-2 text-[11px]"
        >
          {buying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 fill-yellow-300 text-yellow-300" />
          )}
          +{st.energyPerPack} · {st.packPrice}
        </button>
      </div>
      {/* Bought (bonus) energy sits above the regen bar, capped at maxBankedEnergy */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-monad-900">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-500"
            animate={{ width: `${(bonus / bonusSlots) * 100}%` }}
            transition={spring}
          />
        </div>
        <span className="whitespace-nowrap text-[11px] font-black text-yellow-300">
          +{bonus}/{bonusSlots} bonus
        </span>
      </div>
      {!st.canBuy && (
        <p className="text-[11px] font-bold text-monad-300">
          Energy cap reached ({st.maxBankedEnergy}). Use some first.
        </p>
      )}
    </div>
  );
}

function NextEnergy({ at, inline }: { at: number | null; inline?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!at) return null;
  const s = Math.max(0, Math.round((at - now) / 1000));
  const txt = `Next ⚡ in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return inline ? <>{txt}</> : <p className="font-mono font-bold text-monad-200">{txt}</p>;
}

const xFor = (level: number) => 50 + Math.sin(level * 0.9) * 30; // percent of width

/**
 * Candy-Crush style path. Only unlocked levels plus the next one are shown; the road keeps
 * going a few steps into a fog so the rest of the map stays a surprise. Always opens on the
 * current level; earlier levels stay replayable.
 */
function LevelMap({
  st,
  busy,
  onPlay,
  onChest,
}: {
  st: PracticeState;
  busy: string | null;
  onPlay: (l: number) => void;
  onChest: (l: number) => void;
}) {
  const current = Math.min(st.level + 1, st.totalLevels);
  const lastVisible = current; // next playable level
  const roadEnd = Math.min(st.totalLevels, lastVisible + FOG_AHEAD);
  const levels = useMemo(() => Array.from({ length: roadEnd }, (_, i) => i + 1), [roadEnd]);
  const height = roadEnd * NODE_GAP + 120;
  const yFor = (level: number) => height - 70 - (level - 1) * NODE_GAP; // level 1 at the bottom
  const checkpoints = new Map(st.checkpoints.map((c) => [c.level, c]));
  const scrolled = useRef(false);

  const scrollToCurrent = (smooth: boolean) =>
    document
      .getElementById(`lvl-${current}`)
      ?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });

  // Always land on the level you're at (instantly on first paint, smoothly when you level up).
  useLayoutEffect(() => {
    scrollToCurrent(scrolled.current);
    scrolled.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const visiblePath = levels
    .filter((l) => l <= lastVisible)
    .map((l, i) => `${i ? "L" : "M"} ${xFor(l)} ${yFor(l)}`)
    .join(" ");
  const fogPath = levels
    .filter((l) => l >= lastVisible)
    .map((l, i) => `${i ? "L" : "M"} ${xFor(l)} ${yFor(l)}`)
    .join(" ");
  const fogBottom = yFor(lastVisible) - NODE_GAP / 2;

  return (
    <div className="relative">
      <div className="metal-card relative overflow-hidden" style={{ height }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={visiblePath}
            fill="none"
            stroke="#2a1d6b"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeWidth: 26 }}
          />
          <path
            d={visiblePath}
            fill="none"
            stroke="#836EF9"
            strokeOpacity="0.45"
            strokeDasharray="2 14"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 6 }}
          />
          <path
            d={fogPath}
            fill="none"
            stroke="#2a1d6b"
            strokeOpacity="0.55"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeWidth: 26 }}
          />
        </svg>

        {/* Fog of war above the next level */}
        {roadEnd > lastVisible && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center justify-end pb-6"
            style={{
              height: fogBottom,
              background:
                "linear-gradient(to top, rgba(16,9,42,0) 0%, rgba(16,9,42,0.85) 35%, #10092a 70%)",
            }}
          >
            <motion.div
              animate={{ x: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 6 }}
              className="flex items-center gap-2 text-monad-400"
            >
              <Cloud className="h-8 w-8" />
              <Cloud className="h-6 w-6 opacity-70" />
            </motion.div>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-monad-400">
              {st.totalLevels - st.level - 1 > 0
                ? `${st.totalLevels - st.level - 1} more levels ahead`
                : "Final level ahead"}
            </p>
          </div>
        )}

        {levels
          .filter((l) => l <= lastVisible)
          .map((l) => {
            const cp = checkpoints.get(l);
            const done = l <= st.level;
            const isCurrent = l === current && st.level < st.totalLevels;
            const stars = st.stars[l] ?? 0;
            return (
              <div
                key={l}
                id={`lvl-${l}`}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 scroll-my-40",
                  isCurrent ? "z-30" : "z-[5]"
                )}
                style={{ left: `${xFor(l)}%`, top: yFor(l) }}
              >
                {isCurrent && (
                  // Mona stands next to the current level, on the side facing the map centre,
                  // above the fog layer so she's never hidden.
                  <motion.div
                    className={cn(
                      "pointer-events-none absolute",
                      cp ? "-top-16" : "top-1/2 -translate-y-1/2",
                      xFor(l) > 50 ? "right-[4.25rem]" : "left-[4.25rem]"
                    )}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                  >
                    <Mascot size={56} float={false} mood="happy" />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-monad-900 shadow">
                      Let&apos;s go!
                    </span>
                  </motion.div>
                )}
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={spring}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92, y: 4 }}
                  disabled={Boolean(busy)}
                  onClick={() => onPlay(l)}
                  aria-label={`Level ${l}${done ? " (replay)" : ""}`}
                  className={cn(
                    "relative flex items-center justify-center rounded-full font-black",
                    cp ? "h-[4.5rem] w-[4.5rem] text-xl" : "h-14 w-14 text-lg sm:h-16 sm:w-16",
                    done &&
                      "bg-gradient-to-b from-monad-300 to-monad text-white shadow-[0_6px_0_0_#3b2a8f]",
                    isCurrent &&
                      "bg-gradient-to-b from-[#6ee00a] to-duo text-white shadow-[0_6px_0_0_#46a302] ring-4 ring-duo/40"
                  )}
                >
                  {isCurrent && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-duo/30" />
                  )}
                  {busy === `level-${l}` ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : cp ? (
                    "🏁"
                  ) : (
                    l
                  )}
                </motion.button>
                {done && (
                  <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i <= stars ? "fill-yellow-300 text-yellow-300" : "text-monad-700"
                        )}
                      />
                    ))}
                  </div>
                )}
                {cp && (
                  <motion.button
                    onClick={() => cp.reached && !cp.claimed && onChest(l)}
                    disabled={!cp.reached || cp.claimed || Boolean(busy)}
                    animate={
                      cp.reached && !cp.claimed ? { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] } : {}
                    }
                    transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0.6 }}
                    className={cn(
                      "absolute top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-2xl px-2.5 py-1.5 text-[11px] font-black sm:px-3 sm:py-2 sm:text-xs",
                      xFor(l) > 50 ? "right-[4.75rem]" : "left-[4.75rem]",
                      cp.claimed
                        ? "bg-monad-900 text-monad-400"
                        : cp.reached
                          ? "bg-gradient-to-b from-yellow-300 to-amber-500 text-[#3b2400] shadow-[0_4px_0_0_#a16207]"
                          : "bg-monad-900/80 text-monad-300"
                    )}
                  >
                    {cp.claimed ? <Check className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                    {cp.claimed ? "Claimed" : `${st.checkpointReward} MON`}
                  </motion.button>
                )}
              </div>
            );
          })}

        {/* Upcoming locked level hint (visible, but no number) */}
        {roadEnd > lastVisible && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 opacity-90"
            style={{ left: `${xFor(lastVisible + 1)}%`, top: yFor(lastVisible + 1) }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-monad-900/90 text-monad-500 shadow-[0_5px_0_0_#150c38]">
              <Lock className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => scrollToCurrent(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-1.5 rounded-full bg-monad px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-monad/40 md:bottom-6"
      >
        <LocateFixed className="h-4 w-4" /> Level {current}
      </button>
    </div>
  );
}
