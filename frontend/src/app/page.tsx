"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  Flame,
  Zap,
  Coins,
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { useMoningoUser, useRewardPool, useStartStreak } from "@/hooks/use-moningo";
import { fetchLessons, fetchUser, type Lesson, type UserResponse } from "@/lib/api";
import { DAILY_STAKE_MON, REWARD_MON, CERT_THRESHOLD, getContractAddress } from "@/lib/contract";
import { formatMon, getErrorMessage } from "@/lib/utils";

const lessonTypeMeta: Record<string, { label: string; emoji: string }> = {
  vocabulary: { label: "Vocabulary", emoji: "📚" },
  grammar: { label: "Grammar", emoji: "✏️" },
  translation: { label: "Translation", emoji: "🌍" },
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { user, isLoading: userLoading, refetch: refetchUser } = useMoningoUser();
  const { data: poolWei } = useRewardPool();
  const startStreak = useStartStreak();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [backendUser, setBackendUser] = useState<UserResponse | null>(null);
  const [contractConfigured, setContractConfigured] = useState(true);

  useEffect(() => {
    setContractConfigured(Boolean(getContractAddress()));
  }, []);

  // Fetch today's lessons
  useEffect(() => {
    let active = true;
    setLessonsLoading(true);
    setLessonsError(null);
    fetchLessons()
      .then((data) => {
        if (active) setLessons(data);
      })
      .catch((e) => {
        if (active) setLessonsError(e instanceof Error ? e.message : "Failed to load lessons");
      })
      .finally(() => {
        if (active) setLessonsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch backend user progress
  useEffect(() => {
    if (!address) {
      setBackendUser(null);
      return;
    }
    let active = true;
    fetchUser(address).then((data) => {
      if (active) setBackendUser(data);
    });
    return () => {
      active = false;
    };
  }, [address]);

  const streak = user?.streak ?? backendUser?.onchain?.streak ?? 0;
  const stakedToday = user?.active ?? false;
  const completedToday = backendUser?.completedToday ?? false;

  const poolMon = useMemo(() => {
    if (!poolWei) return "0";
    return formatMon(poolWei as bigint, 2);
  }, [poolWei]);

  const handleStartStreak = async () => {
    try {
      await startStreak.startStreak();
    } catch (e) {
      console.error("startStreak failed:", e);
    }
  };

  // Refetch user state after tx confirmed
  useEffect(() => {
    if (startStreak.isConfirmed) {
      refetchUser();
    }
  }, [startStreak.isConfirmed, refetchUser]);

  const isBusy =
    startStreak.isPending || startStreak.isConfirming;

  return (
    <div className="container max-w-6xl space-y-8 py-8 animate-fade-in">
      {/* Hero */}
      <section className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Learn English. <span className="text-monad">Stake MON.</span>{" "}
          <span className="text-flame">Keep your streak.</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Moningo is a minimalist Web3 English learning platform on Monad Testnet.
          Stake <strong className="text-foreground">0.1 MON</strong>, finish today&rsquo;s
          3 lessons, and claim your stake back plus a <strong className="text-foreground">0.01 MON</strong> reward.
          Complete {CERT_THRESHOLD} tasks to mint a soulbound certificate NFT.
        </p>
      </section>

      {/* Contract not configured warning */}
      {!contractConfigured && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Contract not configured</p>
            <p className="text-amber-200/80">
              Set <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS</code>{" "}
              or run the backend so <code className="rounded bg-amber-500/20 px-1">/api/config</code> can provide it.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Zap}
          label="Monad Block Time"
          value="0.4s"
          hint="High-throughput L1 · 10k TPS"
          accent="monad"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={streak}
          hint={stakedToday ? "Active today" : "No active stake"}
          accent="flame"
        />
        <StatCard
          icon={Coins}
          label="Reward Pool"
          value={`${poolMon} MON`}
          hint="Funded by community & owner"
          accent="amber"
        />
      </section>

      {/* Action panel */}
      <section>
        <Card className="overflow-hidden border-monad/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-monad" />
              Today&rsquo;s English Lesson
            </CardTitle>
            <CardDescription>
              Stake {DAILY_STAKE_MON} MON to unlock today&rsquo;s quiz. Complete all 3
              lessons to claim your stake back + {REWARD_MON} MON reward.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                Connect your Monad Testnet wallet to start staking and learning.
              </div>
            ) : stakedToday ? (
              <div className="flex items-center gap-3 rounded-xl border border-monad/30 bg-monad/10 p-4 text-sm">
                <CheckCircle2 className="h-5 w-5 text-monad" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Stake active — you&rsquo;re learning today!</p>
                  <p className="text-muted-foreground">
                    {completedToday
                      ? "All lessons done. Go to Learn to claim your stake back."
                      : "Head to the Learn page to complete your daily lessons."}
                  </p>
                </div>
                <Link href="/learn">
                  <Button variant="default" className="gap-2">
                    {completedToday ? "Claim Stake" : "Start Lessons"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="flame"
                  size="lg"
                  onClick={handleStartStreak}
                  disabled={isBusy || !contractConfigured}
                  className="w-full sm:w-auto"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {startStreak.isPending ? "Confirm in wallet…" : "Waiting for confirmation…"}
                    </>
                  ) : (
                    <>
                      <Flame className="h-5 w-5 fill-white" />
                      Stake {DAILY_STAKE_MON} MON & Start Today&rsquo;s English Lesson
                    </>
                  )}
                </Button>
                {startStreak.isError && (
                  <p className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {getErrorMessage(startStreak.error)}
                  </p>
                )}
                {startStreak.isConfirmed && (
                  <p className="flex items-center gap-2 text-sm text-monad">
                    <CheckCircle2 className="h-4 w-4" />
                    Streak started! Loading your lessons…
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This calls <code className="rounded bg-secondary px-1">startStreak()</code> on the
                  Moningo contract, sending exactly {DAILY_STAKE_MON} MON. You&rsquo;ll get it back
                  after completing today&rsquo;s lessons.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Lessons list */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="h-5 w-5 text-monad" />
            Today&rsquo;s Lessons
          </h2>
          <span className="text-sm text-muted-foreground">
            {lessons.length} lessons · rotates daily
          </span>
        </div>

        {lessonsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="space-y-3 p-5">
                  <div className="h-4 w-20 rounded bg-secondary" />
                  <div className="h-6 w-full rounded bg-secondary" />
                  <div className="h-4 w-24 rounded bg-secondary" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lessonsError ? (
          <Card className="border-destructive/30">
            <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
              <AlertCircle className="h-5 w-5" />
              {lessonsError}
            </CardContent>
          </Card>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No lessons available. Make sure the backend is running.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => {
              const meta = lessonTypeMeta[lesson.type] ?? { label: lesson.type, emoji: "📝" };
              return (
                <Card key={lesson.id} className="group transition-all hover:border-monad/40 hover:glow-monad">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground">#{lesson.id}</span>
                    </div>
                    <p className="line-clamp-2 font-medium text-foreground">{lesson.question}</p>
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {lesson.options.length} options
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Certificate nudge */}
      {streak > 0 && (
        <section>
          <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20">
                  <Trophy className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Certificate progress</p>
                  <p className="text-sm text-muted-foreground">
                    Complete {CERT_THRESHOLD} daily tasks to mint your soulbound NFT certificate.
                    Current streak: <strong className="text-foreground">{streak}</strong>/{CERT_THRESHOLD}
                  </p>
                </div>
              </div>
              <Link href="/learn">
                <Button variant="outline" className="gap-2">
                  Continue Learning
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
