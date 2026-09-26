"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Loader2, Swords, Timer, Zap, Bot, ExternalLink } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Confetti, CountUp, spring } from "@/components/motion";
import { QuestionCard } from "@/components/question-card";
import { WalletButton } from "@/components/wallet-button";
import { useDuel } from "@/hooks/use-duel";
import { useAppConfig, useChainTx, useMonBalance } from "@/hooks/use-moningo";
import { duelAbi } from "@/lib/games-abi";
import { withTxToast } from "@/lib/tx-toast";
import { MONAD_EXPLORER } from "@/lib/wagmi";
import { cn, shortAddress } from "@/lib/utils";

const STAKE_WEI = 500_000_000_000_000_000n;
const JOIN_GAS = 150_000n;

export default function DuelPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const { data: config } = useAppConfig();
  const { data: balance } = useMonBalance();
  const duel = useDuel(address);
  const send = useChainTx();
  const [staking, setStaking] = useState(false);
  const [searchStart, setSearchStart] = useState(0);
  const { state } = duel;
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["duel-stats", address],
    queryFn: () => api.duelStats(address!),
    enabled: Boolean(address),
  });
  useEffect(() => {
    if (state.phase === "result" || state.phase === "idle") refetchStats();
  }, [state.phase, refetchStats]);
  const limitHit = Boolean(stats && stats.todayPlayed >= stats.dailyLimit);

  useEffect(() => {
    if (state.phase === "searching") setSearchStart(Date.now());
  }, [state.phase]);

  if (!mounted) return null;
  if (!isConnected || !address) {
    return (
      <Shell>
        <Mascot size={140} />
        <h1 className="metal-text text-3xl font-black">Connect to duel</h1>
        <WalletButton />
      </Shell>
    );
  }

  const me = address;
  const opp = state.match?.opponent;
  const myScore = state.scores[me] ?? 0;
  const oppScore = opp ? state.scores[opp] ?? 0 : 0;
  const iStaked = state.match?.joined.some((j) => j.toLowerCase() === me.toLowerCase());
  const oppStaked = state.match?.joined.some((j) => j.toLowerCase() === opp?.toLowerCase());
  const lowBalance = balance && balance.value < STAKE_WEI + 20_000_000_000_000_000n;

  const stake = async () => {
    if (!state.match) return;
    setStaking(true);
    try {
      await withTxToast("Stake 0.5 MON", () =>
        send({
          address: state.match!.contract,
          abi: duelAbi,
          functionName: "join",
          args: [state.match!.nonce, state.match!.opponent],
          value: STAKE_WEI,
          gas: JOIN_GAS,
        })
      );
    } catch {
      /* toast shows it */
    } finally {
      setStaking(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        <motion.div key={phaseKey(state.phase)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={spring}>
          {state.phase === "connecting" && (
            <Shell>
              <Loader2 className="h-8 w-8 animate-spin text-monad" />
              <p className="font-bold text-monad-200">Connecting to the duel arena…</p>
            </Shell>
          )}

          {state.phase === "idle" && (
            <Shell>
              <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}>
                <Swords className="h-16 w-16 text-monad" />
              </motion.div>
              <h1 className="metal-text text-4xl font-black">1v1 Duel</h1>
              <p className="text-balance text-monad-100/80">
                Get matched with another learner. You both stake <b>{config?.duel.stake ?? "0.5"} MON</b>, answer 5 timed questions,
                and the winner takes <b>{config?.duel.payout ?? "0.99"} MON</b>. Speed matters: faster correct answers score more.
              </p>
              <div className="grid w-full grid-cols-3 gap-2 text-center text-sm">
                <Rule k="Stake" v="0.5 MON" />
                <Rule k="Winner gets" v="0.99 MON" />
                <Rule k="Fee" v="0.01 MON" />
              </div>
              {stats && (
                <div className="flex w-full items-center justify-between rounded-2xl bg-monad-900/60 px-4 py-2 text-sm font-bold">
                  <span className="text-monad-200">Today</span>
                  <span className="flex gap-1">
                    {Array.from({ length: stats.dailyLimit }, (_, i) => (
                      <span key={i} className={cn("h-3 w-3 rounded-full", i < stats.todayPlayed ? "bg-monad-700" : "bg-duo")} />
                    ))}
                  </span>
                  <span className="text-white">{Math.max(0, stats.dailyLimit - stats.todayPlayed)} duels left</span>
                </div>
              )}
              {stats && stats.winStreak > 0 && <p className="text-sm font-black text-flame">🔥 {stats.winStreak} win streak: keep it going for a badge NFT!</p>}
              <button onClick={duel.findOpponent} disabled={Boolean(lowBalance) || limitHit} className="btn-monad w-full sm:w-auto">
                <Swords className="h-5 w-5" /> Find opponent
              </button>
              {lowBalance && <p className="text-sm font-bold text-duo-red">You need at least ~0.52 MON to duel.</p>}
              {limitHit && <p className="text-sm font-bold text-duo-red">Daily duel limit reached. Come back tomorrow!</p>}
              <p className="text-xs text-monad-300">{state.online} player(s) online · settled on Monad by the referee contract</p>
            </Shell>
          )}

          {state.phase === "searching" && (
            <Shell>
              <Radar />
              <h2 className="text-2xl font-black text-white">Looking for an opponent…</h2>
              <SearchTimer since={searchStart} onBotOffer={
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={duel.playBot} className="btn-berry">
                  <Bot className="h-5 w-5" /> Play vs Mona bot
                </motion.button>
              } />
              <button onClick={duel.leave} className="text-sm font-bold text-monad-300 hover:text-white">Cancel</button>
            </Shell>
          )}

          {state.phase === "matched" && state.match && (
            <Shell>
              <VsBanner me={me} opp={state.match.opponent} bot={state.match.vsBot} />
              <div className="grid w-full grid-cols-2 gap-3 text-sm font-bold">
                <StakeStatus label="You" done={Boolean(iStaked)} />
                <StakeStatus label={state.match.vsBot ? "Mona" : "Opponent"} done={Boolean(oppStaked)} />
              </div>
              {!iStaked ? (
                <button onClick={stake} disabled={staking} className="btn-green w-full sm:w-auto">
                  {staking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />} Stake 0.5 MON
                </button>
              ) : (
                <p className="flex items-center gap-2 font-bold text-monad-200">
                  <Loader2 className="h-4 w-4 animate-spin" /> Waiting for opponent&apos;s stake…
                </p>
              )}
              <Deadline until={state.match.joinDeadline} />
            </Shell>
          )}

          {state.phase === "countdown" && <Countdown />}

          {(state.phase === "question" || state.phase === "reveal") && state.question && (
            <div className="space-y-5">
              <Scoreboard me={me} opp={opp!} myScore={myScore} oppScore={oppScore} bot={state.match?.vsBot} oppAnswered={state.opponentAnswered} />
              <div className="flex items-center justify-between text-sm font-black text-monad-200">
                <span>Question {state.question.i + 1}/{state.question.total}</span>
                {state.phase === "question" && <QuestionTimer endsAt={state.question.endsAt} />}
              </div>
              <QuestionCard
                q={state.question.q}
                mood={state.reveal ? (state.reveal.you.correct ? "cheer" : "sad") : "think"}
                disabled={Boolean(state.myAnswer) || state.phase === "reveal"}
                onSelect={duel.answer}
                wrongPulse={state.reveal && !state.reveal.you.correct ? state.reveal.i + 1 : 0}
                states={Object.fromEntries(
                  state.question.q.options.map((o) => [
                    o,
                    state.reveal ? (o === state.reveal.answer ? "correct" : o === state.myAnswer ? "wrong" : undefined) : o === state.myAnswer ? "selected" : undefined,
                  ])
                )}
              />
              <AnimatePresence>
                {state.reveal && (
                  <motion.p initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={cn("text-center text-2xl font-black", state.reveal.you.correct ? "text-duo" : "text-duo-red")}>
                    {state.reveal.you.correct ? `+${state.reveal.you.points} pts` : state.reveal.you.option ? "Wrong!" : "Too slow!"}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {state.phase === "settling" && (
            <Shell>
              <Loader2 className="h-10 w-10 animate-spin text-monad" />
              <h2 className="text-2xl font-black text-white">Settling the pot on Monad…</h2>
              <Scoreboard me={me} opp={opp!} myScore={myScore} oppScore={oppScore} bot={state.match?.vsBot} />
            </Shell>
          )}

          {state.phase === "result" && state.result && (
            <Shell>
              <Confetti fire={state.result.winner?.toLowerCase() === me.toLowerCase() ? state.result.txHash ?? "win" : null} />
              {(() => {
                const won = state.result.winner?.toLowerCase() === me.toLowerCase();
                return (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 10 }}>
                      <Mascot size={150} mood={won ? "cheer" : state.result.draw ? "think" : "sad"} />
                    </motion.div>
                    <h1 className="metal-text text-4xl font-black">{won ? "You won!" : state.result.draw ? "It's a draw" : "You lost"}</h1>
                    <p className="text-lg font-bold text-monad-100">
                      {won ? `+${state.result.payout} MON sent to your wallet` : state.result.draw ? "Both stakes refunded" : "Better luck next time!"}
                    </p>
                  </>
                );
              })()}
              <Scoreboard me={me} opp={opp!} myScore={myScore} oppScore={oppScore} bot={state.match?.vsBot} />
              {state.result.txHash && (
                <a href={`${MONAD_EXPLORER}/tx/${state.result.txHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-bold text-monad-300 hover:text-white">
                  Settlement tx <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button onClick={duel.reset} className="btn-monad">Play again</button>
            </Shell>
          )}

          {state.phase === "cancelled" && (
            <Shell>
              <Mascot size={120} mood="sad" />
              <h2 className="text-2xl font-black text-white">Duel cancelled</h2>
              <p className="text-monad-100/80">{state.cancelReason}</p>
              <button onClick={duel.reset} className="btn-monad">Back</button>
            </Shell>
          )}
        </motion.div>
      </AnimatePresence>
      {state.error && <p className="mt-4 text-center font-bold text-duo-red">{state.error}</p>}
    </div>
  );
}

const phaseKey = (p: string) => (p === "reveal" ? "question" : p);

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="metal-card flex flex-col items-center gap-5 p-8 text-center">{children}</section>;
}

function Rule({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-monad-900/60 p-3">
      <p className="text-[11px] font-extrabold uppercase text-monad-300">{k}</p>
      <p className="font-black text-white">{v}</p>
    </div>
  );
}

function Radar() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-monad"
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
        />
      ))}
      <Mascot size={90} mood="think" float={false} />
    </div>
  );
}

function SearchTimer({ since, onBotOffer }: { since: number; onBotOffer: React.ReactNode }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const secs = Math.floor((now - since) / 1000);
  return (
    <>
      <p className="font-mono text-monad-200">{secs}s</p>
      {secs >= 8 && onBotOffer}
    </>
  );
}

function Avatar({ label, bot, you }: { label: string; bot?: boolean; you?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("rounded-full p-1", you ? "bg-gradient-to-br from-monad-300 to-monad" : "bg-gradient-to-br from-berry-400 to-berry")}>
        <div className="rounded-full bg-[#140a33] p-1.5">{bot ? <Mascot size={64} float={false} mood="cheer" /> : <Mascot size={64} float={false} />}</div>
      </div>
      <span className="font-mono text-xs font-bold text-monad-100">{label}</span>
    </div>
  );
}

function VsBanner({ me, opp, bot }: { me: string; opp: string; bot: boolean }) {
  return (
    <div className="flex w-full items-center justify-around">
      <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}>
        <Avatar label="You" you />
      </motion.div>
      <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.25 }} className="metal-text text-5xl font-black">
        VS
      </motion.span>
      <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}>
        <Avatar label={bot ? "Mona 🤖" : shortAddress(opp)} bot={bot} />
      </motion.div>
      <span className="sr-only">{me}</span>
    </div>
  );
}

function StakeStatus({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={cn("rounded-2xl border-2 p-3 transition-colors", done ? "border-duo bg-duo/15 text-duo" : "border-monad-800 bg-monad-900/50 text-monad-300")}>
      {label}: {done ? "staked ✓" : "not staked"}
    </div>
  );
}

function Deadline({ until }: { until: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.round((until - now) / 1000));
  return <p className="text-xs text-monad-300">Both players must stake within {s}s or stakes are refunded.</p>;
}

function Countdown() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const t = setInterval(() => setN((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={n}
          initial={{ scale: 2.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="metal-text text-[9rem] font-black"
        >
          {n > 0 ? n : "GO!"}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function QuestionTimer({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, endsAt - now);
  const pct = Math.min(100, (left / 12000) * 100);
  return (
    <span className="flex items-center gap-2">
      <Timer className={cn("h-4 w-4", left < 4000 && "animate-pulse text-duo-red")} />
      <span className="h-2 w-28 overflow-hidden rounded-full bg-monad-900">
        <span className={cn("block h-full rounded-full transition-[width] duration-100", left < 4000 ? "bg-duo-red" : "bg-monad")} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-8 text-right font-mono">{Math.ceil(left / 1000)}s</span>
    </span>
  );
}

function Scoreboard({ me, opp, myScore, oppScore, bot, oppAnswered }: { me: string; opp: string; myScore: number; oppScore: number; bot?: boolean; oppAnswered?: boolean }) {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      <div className="rounded-2xl border-2 border-monad bg-monad/15 p-3 text-left">
        <p className="text-xs font-extrabold uppercase text-monad-200">You · {shortAddress(me)}</p>
        <CountUp value={myScore} className="text-3xl font-black text-white" />
      </div>
      <div className="relative rounded-2xl border-2 border-berry bg-berry/15 p-3 text-right">
        <p className="text-xs font-extrabold uppercase text-pink-200">{bot ? "Mona 🤖" : shortAddress(opp)}</p>
        <CountUp value={oppScore} className="text-3xl font-black text-white" />
        <AnimatePresence>
          {oppAnswered && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -left-2 -top-2 rounded-full bg-flame px-2 py-0.5 text-[10px] font-black text-white">
              answered!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
