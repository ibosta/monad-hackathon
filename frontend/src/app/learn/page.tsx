"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Loader2, X, Heart } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot";
import { Confetti, spring } from "@/components/motion";
import { ActionBar, QuestionCard } from "@/components/question-card";
import { TxBadge } from "@/components/tx-badge";
import { WalletButton } from "@/components/wallet-button";
import { api, type Lesson } from "@/lib/api";
import { nextTier, rewardFor } from "@/lib/contract";
import { useOnchainUser, type TxResult } from "@/hooks/use-moningo";
import { toast } from "sonner";
import { LoadError } from "@/components/load-error";
import { cn } from "@/lib/utils";

type Feedback = { correct: boolean; answer: string } | null;

export default function LearnPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const qc = useQueryClient();
  const { user, refetch: refetchOnchain } = useOnchainUser();
  const lessonsQ = useQuery({ queryKey: ["lessons"], queryFn: api.lessons });
  const lessons = lessonsQ.data;
  const {
    data: me,
    refetch: refetchMe,
    isError: meError,
  } = useQuery({
    queryKey: ["user", address],
    queryFn: () => api.user(address!),
    enabled: Boolean(address),
  });

  // Quiz state: a queue so wrong answers come back at the end (Duolingo style).
  const [queue, setQueue] = useState<Lesson[] | null>(null);
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongPulse, setWrongPulse] = useState(0);
  const [combo, setCombo] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [claimTx, setClaimTx] = useState<TxResult | null>(null);

  const total = lessons?.length ?? 3;
  const doneIds = useMemo(
    () => new Set(me?.todayProgress.filter((p) => p.score > 0).map((p) => p.lessonId)),
    [me]
  );
  const lessonsDone = Boolean(me?.completedToday);
  const claimed = Boolean(user?.claimedToday) || Boolean(claimTx);
  // Reward for today's claim grows with the streak (streak + 1 once today is claimed).
  const todayStreak = (user?.streak ?? 0) + (claimed ? 0 : 1);
  const todayReward = user?.nextReward && !claimed ? user.nextReward : rewardFor(todayStreak);
  const upcoming = nextTier(todayStreak);
  const current = queue?.[0];
  const solved = queue ? total - new Set(queue.map((q) => q.id)).size : doneIds.size;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch {
      /* surfaced via toast */
    } finally {
      setBusy(null);
    }
  }

  const startLessons = () => setQueue((lessons ?? []).filter((l) => !doneIds.has(l.id)));

  const check = () => {
    if (!current || !selected) return;
    const correct = selected === current.answer;
    setFeedback({ correct, answer: current.answer });
    setCombo((c) => (correct ? c + 1 : 0));
    if (!correct) setWrongPulse((n) => n + 1);
    if (!(current.id in firstTry)) setFirstTry((f) => ({ ...f, [current.id]: correct }));
  };

  const next = () =>
    run("Saving", async () => {
      if (!current || !feedback || !address) return;
      let rest = queue!.slice(1);
      if (feedback.correct) {
        const score = firstTry[current.id] === false ? 50 : 100;
        await api.syncProgress(address, current.id, score);
      } else {
        rest = [...rest, current]; // try again later
      }
      setQueue(rest);
      setSelected(null);
      setFeedback(null);
      if (rest.length === 0) await refetchMe();
    });

  /** Sponsored claim: the backend sends the tx and pays gas, so the full reward lands in the wallet. */
  const claim = () =>
    run("Claiming", async () => {
      const id = toast.loading(`Claiming +${todayReward} MON…`, { description: "Gas is on us ⛽" });
      try {
        const r = await api.dailyClaim(address!);
        setClaimTx({ hash: r.txHash, ms: r.ms });
        toast.success(`+${r.reward ?? todayReward} MON received 🎉`, {
          id,
          description: `Settled on Monad in ${(r.ms / 1000).toFixed(2)}s · streak ${r.streak ?? todayStreak}`,
        });
      } catch (e) {
        toast.error("Claim failed", {
          id,
          description: e instanceof Error ? e.message : "Try again",
        });
        throw e;
      }
      await Promise.all([
        refetchOnchain(),
        refetchMe(),
        qc.invalidateQueries({ queryKey: ["config"] }),
      ]);
    });

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <Hub
        mood="happy"
        title="Connect your wallet to start"
        text="Your wallet is your account. Progress and rewards live on Monad."
      >
        <WalletButton />
      </Hub>
    );
  }

  if (lessonsQ.isError || meError)
    return (
      <LoadError
        what="today's lessons"
        onRetry={() => {
          lessonsQ.refetch();
          refetchMe();
        }}
      />
    );
  if (!lessons || !me) return <Hub mood="think" title="Loading today's lessons…" text="" />;

  // ---------- In-lesson view ----------
  if (queue && current) {
    const progress = (solved / total) * 100;
    const states: Record<string, string | undefined> = {};
    for (const o of current.options) {
      if (feedback)
        states[o] = o === feedback.answer ? "correct" : o === selected ? "wrong" : undefined;
      else if (o === selected) states[o] = "selected";
    }
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
        <div className="mb-8 flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setQueue(null)}
            aria-label="Quit lesson"
            className="text-monad-300 hover:text-white"
          >
            <X className="h-6 w-6" />
          </motion.button>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-monad-900">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-duo to-[#89e219]"
              animate={{ width: `${Math.max(progress, 4)}%` }}
              transition={spring}
            />
            <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/25" />
          </div>
          <AnimatePresence mode="popLayout">
            {combo >= 2 ? (
              <motion.span
                key={combo}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="font-black text-flame"
              >
                🔥x{combo}
              </motion.span>
            ) : (
              <motion.span
                key="heart"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 font-black text-duo-red"
              >
                <Heart className="h-5 w-5 fill-duo-red" />∞
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <QuestionCard
          q={current}
          mood={feedback ? (feedback.correct ? "cheer" : "sad") : "think"}
          states={states}
          disabled={Boolean(feedback)}
          onSelect={setSelected}
          wrongPulse={wrongPulse}
        />

        <div className="flex-1" />
        <ActionBar
          feedback={
            feedback && {
              correct: feedback.correct,
              text: feedback.correct ? pickPraise(combo) : `Correct answer: ${feedback.answer}`,
            }
          }
        >
          {feedback ? (
            <button
              onClick={next}
              disabled={Boolean(busy)}
              className={cn("w-full", feedback.correct ? "btn-green" : "btn-berry")}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
            </button>
          ) : (
            <button onClick={check} disabled={!selected} className="btn-green w-full">
              Check
            </button>
          )}
        </ActionBar>
      </div>
    );
  }

  // ---------- Hub view: lessons -> claim ----------
  const stage = claimed ? "claimed" : !lessonsDone ? "lessons" : "claim";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Confetti fire={claimTx?.hash} />
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={spring}
        >
          {stage === "claimed" && (
            <Hub
              mood="cheer"
              title="Daily quest complete! 🎉"
              text={
                upcoming
                  ? `Come back tomorrow to keep your streak. At day ${upcoming.from} your daily reward grows to ${upcoming.reward} MON.`
                  : "Come back tomorrow to keep your streak alive!"
              }
            >
              {claimTx && <TxBadge tx={claimTx} label="Reward paid" />}
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring, delay: 0.3 }}
                className="text-3xl font-black text-flame"
              >
                🔥 {user?.streak ?? 0} day streak
              </motion.p>
              <p className="font-bold text-monad-100">
                Tomorrow:{" "}
                <span className="text-yellow-300">+{rewardFor((user?.streak ?? 0) + 1)} MON</span>
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/streak" className="btn-ghost-3d">
                  Streak tree
                </Link>
                <Link href="/practice" className="btn-monad">
                  Keep practicing
                </Link>
              </div>
            </Hub>
          )}
          {stage === "lessons" && (
            <Hub
              mood="happy"
              title={
                doneIds.size ? `${doneIds.size}/${total} lessons done` : "Ready for today's lesson?"
              }
              text={`Finish ${total} short lessons to earn +${todayReward} MON and grow your streak to day ${todayStreak}. No stake needed.`}
            >
              <RewardLadder streak={todayStreak} />
              <LessonDots total={total} done={doneIds.size} />
              <button onClick={startLessons} className="btn-green w-full sm:w-auto">
                {doneIds.size ? "Continue lessons" : "Start lessons"}
              </button>
            </Hub>
          )}
          {stage === "claim" && (
            <Hub
              mood="cheer"
              title="All lessons done!"
              text={`Day ${todayStreak} of your streak pays +${todayReward} MON. Gas is sponsored by Moningo, so you keep the full reward.`}
            >
              <ActionButton busy={busy} onClick={claim} className="btn-green">
                Claim +{todayReward} MON
              </ActionButton>
            </Hub>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Shows where today's streak sits on the reward tiers. */
function RewardLadder({ streak }: { streak: number }) {
  const upcoming = nextTier(streak);
  return (
    <div className="w-full rounded-2xl bg-monad-900/60 p-3 text-left text-sm font-bold">
      <div className="flex items-center justify-between">
        <span className="text-monad-200">Day {streak} reward</span>
        <span className="text-yellow-300">+{rewardFor(streak)} MON</span>
      </div>
      {upcoming && (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-monad-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-flame to-yellow-300"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (streak / upcoming.from) * 100)}%` }}
              transition={spring}
            />
          </div>
          <p className="mt-1 text-xs text-monad-300">
            {upcoming.from - streak} more day{upcoming.from - streak === 1 ? "" : "s"} → +
            {upcoming.reward} MON / day
          </p>
        </>
      )}
    </div>
  );
}

const PRAISE = ["Nicely done! 🎉", "Great job! ✨", "You got it! 💜", "Awesome! 🚀", "On fire! 🔥"];
function pickPraise(combo: number) {
  return combo >= 3 ? `${combo} in a row! 🔥` : PRAISE[combo % PRAISE.length];
}

function LessonDots({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex gap-3">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: i * 0.08 }}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border-b-4 text-lg font-black",
            i < done
              ? "border-duo-dark bg-duo text-white"
              : "border-monad-800 bg-monad-900 text-monad-300"
          )}
        >
          {i < done ? "✓" : i + 1}
        </motion.div>
      ))}
    </div>
  );
}

function ActionButton({
  busy,
  onClick,
  className,
  children,
}: {
  busy: string | null;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      disabled={Boolean(busy)}
      className={cn(className, "w-full sm:w-auto")}
    >
      {busy ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> {busy}…
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

function Hub({
  mood,
  title,
  text,
  children,
}: {
  mood: MascotMood;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="metal-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <Mascot mood={mood} size={150} />
      <h1 className="metal-text text-3xl font-black">{title}</h1>
      {text && <p className="text-balance text-monad-100/80">{text}</p>}
      {children}
    </section>
  );
}
