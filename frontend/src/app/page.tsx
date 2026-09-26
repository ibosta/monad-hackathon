"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Flame, Coins, Award, Landmark, Check, Lock, Trophy, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import { Mascot } from "@/components/mascot";
import { CountUp, Stagger, StaggerItem } from "@/components/motion";
import { Certificate } from "@/components/certificate";
import { WalletButton } from "@/components/wallet-button";
import { api } from "@/lib/api";
import { useAppConfig, useMonBalance, useOnchainUser } from "@/hooks/use-moningo";
import { EXAM_FEE_MON, LEVEL_NAMES, nextTier, rewardFor } from "@/lib/contract";
import { cn, formatMon, shortAddress } from "@/lib/utils";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const { data: config } = useAppConfig();
  const { user } = useOnchainUser();
  const { data: balance } = useMonBalance();
  const { data: me } = useQuery({
    queryKey: ["user", address],
    queryFn: () => api.user(address!),
    enabled: Boolean(address),
    refetchInterval: 5_000,
  });
  const { data: board } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: api.leaderboard,
    refetchInterval: 10_000,
  });

  const connected = mounted && isConnected;
  const doneToday = me?.todayProgress.filter((p) => p.score > 0).length ?? 0;
  const lessonsPerDay = config?.lessonsPerDay ?? 3;
  const claimedToday = Boolean(user?.claimedToday);
  const todayStreak = (user?.streak ?? 0) + (claimedToday ? 0 : 1);
  const todayReward = rewardFor(todayStreak);
  const upcoming = nextTier(todayStreak);

  return (
    <Stagger className="space-y-6">
      {/* Hero */}
      <StaggerItem>
        <section className="metal-card overflow-hidden p-6 sm:p-10">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <motion.div
              initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            >
              <Mascot mood={claimedToday ? "cheer" : "happy"} size={170} />
            </motion.div>
            <div className="flex-1 space-y-3">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-monad-300">
                Hi, I&apos;m Mona 👋
              </p>
              <h1 className="metal-text text-4xl font-black leading-tight sm:text-5xl">
                Learn English.
                <br />
                Earn MON.
              </h1>
              <p className="text-balance text-monad-100/80">
                Finish 3 bite-sized lessons a day and earn MON. The longer your streak, the more you
                earn: from <b>0.005</b> up to <b>0.03 MON</b> per day. Prove your level to mint an on-chain CEFR certificate NFT.
                Settled on Monad in under a second.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2 md:justify-start">
                {connected ? (
                  <>
                    <Link href="/learn" className="btn-green">
                      {claimedToday ? "Practice again tomorrow" : "Start daily lesson"}
                    </Link>
                    <Link href="/exam" className="btn-ghost-3d">
                      Level test
                    </Link>
                  </>
                ) : (
                  <WalletButton />
                )}
              </div>
            </div>
          </div>
        </section>
      </StaggerItem>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<Flame className="h-5 w-5 fill-flame text-flame" />}
          label="Day streak"
          value={<CountUp value={user?.streak ?? 0} />}
          tone="text-flame"
        />
        <Stat
          icon={<Coins className="h-5 w-5 text-yellow-300" />}
          label="Your MON"
          value={
            connected && balance ? (
              <CountUp value={Number(formatMon(balance.value, 3))} decimals={3} />
            ) : (
              "—"
            )
          }
          tone="text-yellow-200"
        />
        <Stat
          icon={<Award className="h-5 w-5 text-monad" />}
          label="Level"
          value={user?.level ? LEVEL_NAMES[user.level] : "—"}
          tone="text-monad-200"
        />
        <Stat
          icon={<Landmark className="h-5 w-5 text-berry-400" />}
          label="Reward pool"
          value={
            config?.rewardPool ? <CountUp value={Number(config.rewardPool)} decimals={2} /> : "—"
          }
          tone="text-pink-200"
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily quest */}
        <StaggerItem hover>
          <section className="metal-card h-full space-y-4 p-6">
            <h2 className="text-xl font-black text-white">Daily quest</h2>
            <Step
              done={doneToday >= lessonsPerDay}
              title={`Finish ${lessonsPerDay} lessons`}
              hint={`${Math.min(doneToday, lessonsPerDay)}/${lessonsPerDay} done`}
            />
            <Step
              done={claimedToday}
              title={`Claim +${todayReward} MON`}
              hint={`Day ${todayStreak} of your streak`}
            />
            {upcoming && (
              <p className="rounded-2xl bg-monad-900/60 px-4 py-2 text-sm font-bold text-monad-200">
                🔥 {upcoming.from - todayStreak} more day{upcoming.from - todayStreak === 1 ? "" : "s"} →{" "}
                <span className="text-yellow-300">+{upcoming.reward} MON</span> every day
              </p>
            )}
            <Link href="/learn" className="btn-monad w-full">
              {claimedToday ? "Done for today 🎉" : "Continue"}
            </Link>
          </section>
        </StaggerItem>

        {/* Certificate */}
        <StaggerItem hover>
          <section className="metal-card h-full space-y-4 p-6">
            <h2 className="text-xl font-black text-white">Your certificate</h2>
            {user?.certificateId ? (
              <Certificate tokenId={user.certificateId} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-monad-900/70">
                  <Lock className="h-7 w-7 text-monad-300" />
                </div>
                <p className="text-monad-100/80">
                  Take the 10-question level test for <b>{EXAM_FEE_MON} MON</b> and mint a soulbound
                  NFT with your CEFR level (A1–C1).
                </p>
              </div>
            )}
            <Link href="/exam" className="btn-berry w-full">
              {user?.certificateId ? "Retake level test" : "Take level test"}
            </Link>
          </section>
        </StaggerItem>
      </div>

      {/* Duel promo */}
      <StaggerItem hover>
        <Link href="/duel" className="metal-card group flex items-center gap-4 p-6">
          <motion.span
            className="text-5xl"
            animate={{ rotate: [0, -12, 12, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.5 }}
          >
            ⚔️
          </motion.span>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white">1v1 Duel</h2>
            <p className="text-monad-200">
              Get matched with a learner, both stake 0.5 MON, fastest correct answers win 0.99 MON.
            </p>
          </div>
          <span className="btn-monad hidden sm:inline-flex">Play</span>
        </Link>
      </StaggerItem>

      {/* Leaderboard */}
      <StaggerItem>
        <section className="metal-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-white">
            <Trophy className="h-5 w-5 text-yellow-300" /> Leaderboard
          </h2>
          {board?.length ? (
            <ol className="space-y-2">
              {board.slice(0, 8).map((u, i) => (
                <motion.li
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  key={u.walletAddress}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-2.5",
                    u.walletAddress.toLowerCase() === address?.toLowerCase()
                      ? "bg-monad/25"
                      : "bg-monad-900/40"
                  )}
                >
                  <span className="flex items-center gap-3 font-bold">
                    <span className="w-6 text-center text-monad-300">
                      {["🥇", "🥈", "🥉"][i] ?? i + 1}
                    </span>
                    <span className="font-mono text-sm">{shortAddress(u.walletAddress)}</span>
                  </span>
                  <span className="font-black text-monad-100">{u.totalScore} XP</span>
                </motion.li>
              ))}
            </ol>
          ) : (
            <p className="text-monad-300">No learners yet. Be the first!</p>
          )}
        </section>
      </StaggerItem>

      {connected && balance && balance.value < 150_000_000_000_000_000n && (
        <a
          href={config?.faucetUrl ?? "https://faucet.monad.xyz"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-monad/40 bg-monad/10 p-4 font-bold text-monad-100"
        >
          <Droplets className="h-5 w-5 text-monad" /> Low on MON? Grab testnet MON from the faucet ↗
        </a>
      )}
    </Stagger>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: string;
}) {
  return (
    <StaggerItem hover className="metal-card p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-monad-300">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-black sm:text-3xl", tone)}>{value}</div>
    </StaggerItem>
  );
}

function Step({ done, title, hint }: { done: boolean; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        animate={done ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.4 }}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          done ? "border-duo bg-duo text-white" : "border-monad-700 bg-monad-900/50 text-monad-400"
        )}
      >
        {done ? (
          <Check className="h-5 w-5" strokeWidth={4} />
        ) : (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-monad-500" />
        )}
      </motion.div>
      <div>
        <p className="font-extrabold text-white">{title}</p>
        <p className="text-sm text-monad-300">{hint}</p>
      </div>
    </div>
  );
}
