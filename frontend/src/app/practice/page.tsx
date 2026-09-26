"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Lock, Star, Zap, Loader2, X, Gift, Check } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Confetti, spring } from "@/components/motion";
import { ActionBar, QuestionCard } from "@/components/question-card";
import { WalletButton } from "@/components/wallet-button";
import { api, type PracticeQuestion, type PracticeState } from "@/lib/api";
import { practiceAbi } from "@/lib/games-abi";
import { withTxToast } from "@/lib/tx-toast";
import { useChainTx } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const GAS = { buyEnergy: 90_000n, claimCheckpoint: 130_000n };
const PACK_WEI = 10_000_000_000_000_000n;

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
  const send = useChainTx();
  const { data: st, refetch } = useQuery({
    queryKey: ["practice", address],
    queryFn: () => api.practice(address!),
    enabled: Boolean(address),
    refetchInterval: 30_000,
  });
  const [play, setPlay] = useState<Play | null>(null);
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
  if (!st)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-monad" />
      </div>
    );

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
      refetch();
    } catch (e) {
      if (e instanceof Error && /energy/i.test(e.message)) setNoEnergy(true);
    } finally {
      setBusy(null);
    }
  };

  const buyEnergy = async () => {
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
      await refetch();
      setNoEnergy(false);
    } catch {
      /* toast */
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
      await refetch();
    } catch {
      /* toast */
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
      refetch();
    };
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => setPlay(null)}
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
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Confetti fire={celebrate} />
      <EnergyBar st={st} onBuy={buyEnergy} buying={busy === "buy"} />
      <LevelMap st={st} busy={busy} onPlay={startLevel} onChest={claimCheckpoint} />

      {/* Level result */}
      <AnimatePresence>
        {finish && (
          <Overlay onClose={() => setFinish(null)}>
            <Confetti
              fire={finish.passed ? `lvl-${finish.level}-${finish.stars}` : null}
              count={40}
            />
            <Mascot size={120} mood={finish.passed ? "cheer" : "sad"} />
            <h2 className="metal-text text-3xl font-black">
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
                      "h-12 w-12",
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
                  setFinish(null);
                  claimCheckpoint(finish.checkpoint!);
                }}
                className="btn-berry"
              >
                <Gift className="h-5 w-5" /> Open chest: +{st.checkpointReward} MON
              </button>
            )}
            <button
              onClick={() => {
                const lvl = finish.passed ? finish.level + 1 : finish.level;
                setFinish(null);
                if (lvl <= st.totalLevels) startLevel(lvl);
              }}
              className="btn-green"
            >
              {finish.passed ? "Next level (1 ⚡)" : "Try again (1 ⚡)"}
            </button>
          </Overlay>
        )}
        {noEnergy && (
          <Overlay onClose={() => setNoEnergy(false)}>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Zap className="h-16 w-16 fill-yellow-300 text-yellow-300" />
            </motion.div>
            <h2 className="metal-text text-3xl font-black">Out of energy</h2>
            <p className="text-monad-100/80">
              Energy refills 1 every {st.regenMinutes} min (max {st.maxEnergy}). Or keep going now:{" "}
              {st.energyPerPack} ⚡ for {st.packPrice} MON.
            </p>
            <NextEnergy at={st.nextEnergyAt} />
            <button onClick={buyEnergy} disabled={busy === "buy"} className="btn-monad">
              {busy === "buy" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )}{" "}
              Buy {st.energyPerPack} ⚡ · {st.packPrice} MON
            </button>
          </Overlay>
        )}
      </AnimatePresence>
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
  const extra = Math.max(0, st.energy - st.maxEnergy);
  return (
    <div className="metal-card sticky top-20 z-30 mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: st.maxEnergy }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring, delay: i * 0.03 }}
            >
              <Zap
                className={cn(
                  "h-5 w-5",
                  i < st.energy ? "fill-yellow-300 text-yellow-300" : "text-monad-700"
                )}
              />
            </motion.span>
          ))}
          {extra > 0 && <span className="ml-1 text-sm font-black text-yellow-300">+{extra}</span>}
        </div>
        <p className="mt-1 text-xs font-bold text-monad-300">
          {st.energy >= st.maxEnergy ? "Energy full" : <NextEnergy at={st.nextEnergyAt} inline />}
        </p>
      </div>
      <button onClick={onBuy} disabled={buying} className="btn-ghost-3d px-3 py-2 text-xs">
        {buying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4 fill-yellow-300 text-yellow-300" />
        )}{" "}
        +{st.energyPerPack} · {st.packPrice} MON
      </button>
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

const NODE_GAP = 96;
const xFor = (level: number) => 50 + Math.sin(level * 0.9) * 32; // percent

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
  const levels = useMemo(
    () => Array.from({ length: st.totalLevels }, (_, i) => i + 1),
    [st.totalLevels]
  );
  const height = st.totalLevels * NODE_GAP + 80;
  const yFor = (level: number) => height - 60 - (level - 1) * NODE_GAP; // level 1 at the bottom, climb up
  const ref = useRef<HTMLDivElement>(null);
  const checkpoints = new Map(st.checkpoints.map((c) => [c.level, c]));

  useEffect(() => {
    const el = document.getElementById(`lvl-${current}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current]);

  const path = levels.map((l, i) => `${i ? "L" : "M"} ${xFor(l)} ${yFor(l)}`).join(" ");

  return (
    <div ref={ref} className="metal-card relative overflow-hidden" style={{ height }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={path}
          fill="none"
          stroke="#2a1d6b"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 26 }}
        />
        <path
          d={path}
          fill="none"
          stroke="#836EF9"
          strokeOpacity="0.35"
          strokeDasharray="2 14"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 6 }}
        />
      </svg>
      {levels.map((l) => {
        const cp = checkpoints.get(l);
        const done = l <= st.level;
        const isCurrent = l === current && st.level < st.totalLevels;
        const locked = l > current;
        const stars = st.stars[l] ?? 0;
        return (
          <div
            key={l}
            id={`lvl-${l}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${xFor(l)}%`, top: yFor(l) }}
          >
            {isCurrent && (
              <motion.div
                className="absolute -top-20 left-1/2 -translate-x-1/2"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              >
                <Mascot size={64} float={false} mood="happy" />
              </motion.div>
            )}
            <motion.button
              whileHover={locked ? undefined : { scale: 1.1 }}
              whileTap={locked ? undefined : { scale: 0.92, y: 4 }}
              disabled={locked || Boolean(busy)}
              onClick={() => onPlay(l)}
              className={cn(
                "relative flex items-center justify-center rounded-full font-black transition-colors",
                cp ? "h-20 w-20 text-xl" : "h-16 w-16 text-lg",
                done &&
                  "bg-gradient-to-b from-monad-300 to-monad text-white shadow-[0_6px_0_0_#3b2a8f]",
                isCurrent &&
                  "bg-gradient-to-b from-[#6ee00a] to-duo text-white shadow-[0_6px_0_0_#46a302] ring-4 ring-duo/40",
                locked && "bg-monad-900 text-monad-600 shadow-[0_6px_0_0_#150c38]"
              )}
            >
              {isCurrent && (
                <span className="absolute inset-0 animate-ping rounded-full bg-duo/30" />
              )}
              {busy === `level-${l}` ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : locked ? (
                <Lock className="h-6 w-6" />
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
                      "h-4 w-4",
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
                  "absolute top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-2xl px-3 py-2 text-xs font-black",
                  xFor(l) > 50 ? "right-24" : "left-24",
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
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="metal-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
