"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Loader2, X, Heart } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot";
import { TxBadge } from "@/components/tx-badge";
import { WalletButton } from "@/components/wallet-button";
import { api, type Lesson } from "@/lib/api";
import { DAILY_STAKE_MON, DAILY_STAKE_WEI, REWARD_MON } from "@/lib/contract";
import { explainError, useMoningoTx, useOnchainUser, type TxResult } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  vocabulary: "📚 New word",
  grammar: "✏️ Grammar",
  translation: "🌍 Translate",
  idiom: "💬 Idiom",
};

type Feedback = { correct: boolean; answer: string } | null;

export default function LearnPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const qc = useQueryClient();
  const send = useMoningoTx();
  const { user, refetch: refetchOnchain } = useOnchainUser();
  const { data: lessons } = useQuery({ queryKey: ["lessons"], queryFn: api.lessons });
  const { data: me, refetch: refetchMe } = useQuery({
    queryKey: ["user", address],
    queryFn: () => api.user(address!),
    enabled: Boolean(address),
  });

  // Quiz state: a queue so wrong answers come back at the end (Duolingo style).
  const [queue, setQueue] = useState<Lesson[] | null>(null);
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [signature, setSignature] = useState<`0x${string}` | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stakeTx, setStakeTx] = useState<TxResult | null>(null);
  const [claimTx, setClaimTx] = useState<TxResult | null>(null);

  const total = lessons?.length ?? 3;
  const doneIds = useMemo(() => new Set(me?.todayProgress.filter((p) => p.score > 0).map((p) => p.lessonId)), [me]);
  const lessonsDone = Boolean(me?.completedToday);
  const claimed = Boolean(me?.rewardSignedToday && user && !user.active) || Boolean(claimTx);
  const current = queue?.[0];
  const solved = queue ? total - new Set(queue.map((q) => q.id)).size : doneIds.size;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(null);
    }
  }

  const stake = () =>
    run("Staking", async () => {
      setStakeTx(await send("startStreak", [], DAILY_STAKE_WEI));
      await refetchOnchain();
    });

  const startLessons = () => {
    const todo = (lessons ?? []).filter((l) => !doneIds.has(l.id));
    setQueue(todo);
  };

  const check = () => {
    if (!current || !selected) return;
    const correct = selected === current.answer;
    setFeedback({ correct, answer: current.answer });
    if (!(current.id in firstTry)) setFirstTry((f) => ({ ...f, [current.id]: correct }));
  };

  const next = () =>
    run("Saving", async () => {
      if (!current || !feedback || !address) return;
      let rest = queue!.slice(1);
      if (feedback.correct) {
        const score = firstTry[current.id] === false ? 50 : 100;
        const res = await api.syncProgress(address, current.id, score);
        if (res.signature) setSignature(res.signature);
      } else {
        rest = [...rest, current]; // try again later
      }
      setQueue(rest);
      setSelected(null);
      setFeedback(null);
      if (rest.length === 0) await refetchMe();
    });

  const claim = () =>
    run("Claiming", async () => {
      let sig = signature;
      if (!sig) sig = (await api.claimSignature(address!)).signature;
      setClaimTx(await send("completeEnglishTask", [sig]));
      await Promise.all([refetchOnchain(), refetchMe(), qc.invalidateQueries({ queryKey: ["config"] })]);
    });

  // ---------- render ----------
  if (!mounted) return null;

  if (!isConnected) {
    return (
      <Center mood="happy" title="Connect your wallet to start" text="Your wallet is your account. Progress and rewards live on Monad.">
        <WalletButton />
      </Center>
    );
  }

  if (!lessons || !me) return <Center mood="think" title="Loading today's lessons…" text="" />;

  // In-lesson view
  if (queue && current) {
    const progress = (solved / total) * 100;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => setQueue(null)} aria-label="Quit lesson" className="text-monad-300 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-monad-900">
            <div className="h-full rounded-full bg-gradient-to-r from-duo to-[#89e219] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="flex items-center gap-1 font-black text-duo-red">
            <Heart className="h-5 w-5 fill-duo-red" />∞
          </span>
        </div>

        <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-monad-300">{TYPE_LABEL[current.type] ?? current.type}</p>
        <div className="mb-6 flex items-end gap-3">
          <Mascot size={90} mood={feedback ? (feedback.correct ? "cheer" : "sad") : "think"} float={false} />
          <div className="relative flex-1 rounded-2xl border-2 border-monad-700 bg-monad-900/60 p-4 text-lg font-extrabold text-white sm:text-xl">
            {current.question}
          </div>
        </div>

        <div className="grid gap-3">
          {current.options.map((o) => (
            <button
              key={o}
              disabled={Boolean(feedback)}
              onClick={() => setSelected(o)}
              className="option-tile"
              data-state={
                feedback ? (o === feedback.answer ? "correct" : o === selected ? "wrong" : undefined) : o === selected ? "selected" : undefined
              }
            >
              {o}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <div
          className={cn(
            "sticky bottom-16 mt-8 rounded-2xl p-4 md:bottom-4",
            feedback ? (feedback.correct ? "bg-duo/15" : "bg-duo-red/15") : "bg-transparent"
          )}
        >
          {feedback && (
            <p className={cn("mb-3 text-lg font-black", feedback.correct ? "text-duo" : "text-duo-red")}>
              {feedback.correct ? "Nicely done! 🎉" : `Correct answer: ${feedback.answer}`}
            </p>
          )}
          {feedback ? (
            <button onClick={next} disabled={Boolean(busy)} className={cn("w-full", feedback.correct ? "btn-green" : "btn-berry")}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
            </button>
          ) : (
            <button onClick={check} disabled={!selected} className="btn-green w-full">
              Check
            </button>
          )}
        </div>
      </div>
    );
  }

  // Hub view: stake -> lessons -> claim
  const active = Boolean(user?.active);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      {claimed ? (
        <Center mood="cheer" title="Daily quest complete! 🎉" text={`Your ${DAILY_STAKE_MON} MON stake is back with a +${REWARD_MON} MON reward. See you tomorrow to keep the streak alive!`}>
          {claimTx && <TxBadge tx={claimTx} label="Reward paid" />}
          <p className="text-3xl font-black text-flame">🔥 {user?.streak ?? 0} day streak</p>
          <Link href="/exam" className="btn-berry">Try the level test</Link>
        </Center>
      ) : !active && !lessonsDone ? (
        <Center mood="happy" title="Ready for today's lesson?" text={`Stake ${DAILY_STAKE_MON} MON to commit. Finish ${total} lessons within 24h and get it back +${REWARD_MON} MON. Miss it and it feeds the reward pool.`}>
          <button onClick={stake} disabled={Boolean(busy)} className="btn-monad w-full sm:w-auto">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {busy}…</> : `Stake ${DAILY_STAKE_MON} MON`}
          </button>
        </Center>
      ) : !lessonsDone ? (
        <Center mood="happy" title={`${doneIds.size}/${total} lessons done`} text="Answer every question correctly. Mistakes come back at the end.">
          {stakeTx && <TxBadge tx={stakeTx} label="Staked" />}
          <button onClick={startLessons} className="btn-green w-full sm:w-auto">{doneIds.size ? "Continue lessons" : "Start lessons"}</button>
        </Center>
      ) : !active ? (
        <Center mood="think" title="Lessons done. Now stake to claim!" text={`You finished today's lessons. Stake ${DAILY_STAKE_MON} MON, then claim it right back with the reward.`}>
          <button onClick={stake} disabled={Boolean(busy)} className="btn-monad w-full sm:w-auto">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {busy}…</> : `Stake ${DAILY_STAKE_MON} MON`}
          </button>
        </Center>
      ) : (
        <Center mood="cheer" title="All lessons done!" text={`Claim your ${DAILY_STAKE_MON} MON stake back plus ${REWARD_MON} MON reward.`}>
          <button onClick={claim} disabled={Boolean(busy)} className="btn-green w-full sm:w-auto">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {busy}…</> : `Claim ${(0.1 + Number(REWARD_MON)).toFixed(2)} MON`}
          </button>
        </Center>
      )}
      {error && <p className="rounded-xl bg-duo-red/15 p-3 text-center font-bold text-duo-red">{error}</p>}
    </div>
  );
}

function Center({ mood, title, text, children }: { mood: MascotMood; title: string; text: string; children?: React.ReactNode }) {
  return (
    <section className="metal-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <Mascot mood={mood} size={150} />
      <h1 className="metal-text text-3xl font-black">{title}</h1>
      {text && <p className="text-balance text-monad-100/80">{text}</p>}
      {children}
    </section>
  );
}
