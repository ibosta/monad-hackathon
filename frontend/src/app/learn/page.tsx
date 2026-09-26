"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import {
  Flame,
  Check,
  X,
  Loader2,
  PartyPopper,
  Trophy,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Coins,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchLessons, syncProgress, type Lesson } from "@/lib/api";
import { useMoningoUser, useClaimAndComplete } from "@/hooks/use-moningo";
import { DAILY_STAKE_MON, REWARD_MON, getContractAddress } from "@/lib/contract";
import { MONAD_EXPLORER } from "@/lib/wagmi";
import { cn } from "@/lib/utils";

type Phase = "idle" | "answering" | "correct" | "wrong";

export default function LearnPage() {
  const { address, isConnected } = useAccount();
  const { user, refetch: refetchUser } = useMoningoUser();
  const claimAndComplete = useClaimAndComplete();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scoreMap, setScoreMap] = useState<Record<number, number>>({});

  const [doneCount, setDoneCount] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [contractConfigured, setContractConfigured] = useState(true);

  useEffect(() => {
    setContractConfigured(Boolean(getContractAddress()));
  }, []);

  const stakedToday = user?.active ?? false;

  // Fetch lessons on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchLessons()
      .then((data) => {
        if (active) {
          setLessons(data);
          if (data.length === 0) setError("No lessons returned from backend.");
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load lessons");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const total = lessons.length;
  const current = lessons[currentIdx];
  const progressValue = total > 0 ? (currentIdx / total) * 100 : 0;

  const handleAnswer = useCallback(
    (option: string) => {
      if (phase !== "idle" && phase !== "answering") return;
      setSelected(option);
      if (!current) return;
      if (option === current.answer) {
        setPhase("correct");
      } else {
        setPhase("wrong");
      }
    },
    [phase, current]
  );

  const handleNext = useCallback(async () => {
    if (!current || !address) {
      // still advance UI even without wallet
      setCurrentIdx((i) => Math.min(i + 1, total - 1));
      setSelected(null);
      setPhase("idle");
      return;
    }

    const isCorrect = phase === "correct";
    const score = isCorrect ? 100 : 0;

    // Sync progress to backend
    try {
      setSyncError(null);
      const res = await syncProgress(address, current.id, score);
      setScoreMap((m) => ({ ...m, [current.id]: score }));
      setDoneCount(res.lessonsDoneToday);

      if (res.completedToday) {
        // All done — trigger completion flow
        setShowComplete(true);
        return;
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Failed to sync progress");
    }

    // Advance to next question
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setPhase("idle");
    } else {
      // Reached last question but not all done today (e.g., some wrong earlier)
      setShowComplete(true);
    }
  }, [current, address, phase, currentIdx, total]);

  const handleClaim = useCallback(async () => {
    await claimAndComplete.run();
    if (claimAndComplete.completeConfirmed) {
      refetchUser();
    }
  }, [claimAndComplete, refetchUser]);

  // Refetch user after completion
  useEffect(() => {
    if (claimAndComplete.completeConfirmed) {
      refetchUser();
    }
  }, [claimAndComplete.completeConfirmed, refetchUser]);

  const resetQuiz = useCallback(() => {
    setCurrentIdx(0);
    setSelected(null);
    setPhase("idle");
    setScoreMap({});
    setDoneCount(0);
    setShowComplete(false);
    setSyncError(null);
  }, []);

  const claimBusy =
    claimAndComplete.fetching ||
    claimAndComplete.completePending ||
    claimAndComplete.completeConfirming;

  const claimStatus = useMemo(() => {
    if (claimAndComplete.completeConfirmed) return "success";
    if (claimAndComplete.completeError || claimAndComplete.fetchError) return "error";
    if (claimBusy) return "pending";
    return "idle";
  }, [claimAndComplete, claimBusy]);

  return (
    <div className="container max-w-2xl space-y-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Flame className="h-6 w-6 text-flame" />
          Daily English Quiz
        </h1>
        <p className="text-sm text-muted-foreground">
          Answer all {total || "—"} questions correctly to sync your progress and claim your stake back on Monad.
        </p>
      </div>

      {/* Staking guard */}
      {isConnected && !stakedToday && !loading && (
        <Card className="border-flame/30 bg-flame/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-flame" />
            <p className="text-muted-foreground">
              You haven&rsquo;t staked today. You can still practice, but to claim your stake back
              you must first call <code className="rounded bg-secondary px-1">startStreak()</code> with {DAILY_STAKE_MON} MON
              from the <a href="/" className="text-monad hover:underline">Dashboard</a>.
            </p>
          </CardContent>
        </Card>
      )}

      {!isConnected && !loading && (
        <Card className="border-monad/30 bg-monad/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-monad" />
            <p className="text-muted-foreground">
              Connect your Monad Testnet wallet to sync your progress and claim rewards.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress bar */}
      {!loading && total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Question {currentIdx + 1} of {total}
            </span>
            <span className="font-mono text-muted-foreground">
              {doneCount}/{total} synced
            </span>
          </div>
          <Progress value={progressValue} className="h-2.5" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-monad" />
            <p className="text-sm text-muted-foreground">Loading today&rsquo;s lessons…</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Quiz card */}
      {!loading && !error && current && (
        <Card key={current.id} className={cn("transition-all", phase === "correct" && "border-monad/40", phase === "wrong" && "border-destructive/40")}>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {current.type}
              </span>
              <span className="text-xs text-muted-foreground">Lesson #{current.id}</span>
            </div>

            <h2 className="text-xl font-bold leading-snug text-foreground">
              {current.question}
            </h2>

            <div className="space-y-2.5">
              {current.options.map((opt) => {
                const isSelected = selected === opt;
                const isAnswer = opt === current.answer;
                const showCorrect = phase !== "idle" && phase !== "answering" && isAnswer;
                const showWrong = phase === "wrong" && isSelected && !isAnswer;

                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={phase === "correct" || phase === "wrong"}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all",
                      "border-border bg-secondary/30 hover:border-monad/40 hover:bg-secondary",
                      "disabled:cursor-default",
                      showCorrect && "border-monad bg-monad/15 text-monad glow-monad",
                      showWrong && "border-destructive bg-destructive/10 text-destructive animate-shake",
                      isSelected && !showCorrect && !showWrong && "border-foreground/40 bg-secondary"
                    )}
                  >
                    <span>{opt}</span>
                    {showCorrect && <Check className="h-5 w-5 shrink-0" />}
                    {showWrong && <X className="h-5 w-5 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {phase === "correct" && (
              <div className="flex items-center gap-2 rounded-xl bg-monad/10 px-4 py-3 text-sm text-monad animate-pop">
                <Check className="h-5 w-5" />
                Correct! Syncing to backend…
              </div>
            )}
            {phase === "wrong" && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive animate-pop">
                <X className="h-5 w-5" />
                Not quite. The correct answer is highlighted in green.
              </div>
            )}

            {syncError && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Sync failed: {syncError}
              </p>
            )}

            {/* Next button */}
            {phase !== "idle" && phase !== "answering" && (
              <Button
                onClick={handleNext}
                className="w-full gap-2"
                size="lg"
                variant={phase === "correct" ? "default" : "outline"}
              >
                {currentIdx < total - 1 ? "Next Question" : "Finish"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion modal */}
      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-monad to-monad-600 shadow-lg shadow-monad/40">
              <PartyPopper className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-center text-2xl">Lessons Complete! 🎉</DialogTitle>
            <DialogDescription className="text-center">
              You finished today&rsquo;s {total} English lessons. Now claim your stake back
              {contractConfigured ? ` plus ${REWARD_MON} MON reward` : ""} on Monad Testnet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!contractConfigured && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Contract not configured — claiming is disabled. Set the contract address via env or backend.
              </div>
            )}

            {!stakedToday && isConnected && (
              <div className="flex items-start gap-2 rounded-xl border border-flame/30 bg-flame/10 p-3 text-xs text-flame">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                You have no active stake. Stake {DAILY_STAKE_MON} MON on the Dashboard first, then claim here.
              </div>
            )}

            {claimStatus === "error" && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {claimAndComplete.fetchError || claimAndComplete.completeError?.message || "Claim failed. Try again."}
              </div>
            )}

            {claimStatus === "success" && claimAndComplete.txHash && (
              <div className="space-y-2 rounded-xl border border-monad/30 bg-monad/10 p-3 text-sm text-monad">
                <p className="flex items-center gap-2 font-semibold">
                  <Trophy className="h-4 w-4" />
                  Stake claimed successfully!
                </p>
                <a
                  href={`${MONAD_EXPLORER}/tx/${claimAndComplete.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
                >
                  View on explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="flame"
              size="lg"
              className="w-full gap-2"
              onClick={handleClaim}
              disabled={
                claimBusy ||
                !contractConfigured ||
                !isConnected ||
                !stakedToday ||
                claimStatus === "success"
              }
            >
              {claimBusy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {claimAndComplete.fetching
                    ? "Getting signature…"
                    : claimAndComplete.completePending
                    ? "Confirm in wallet…"
                    : "Waiting for confirmation…"}
                </>
              ) : claimStatus === "success" ? (
                <>
                  <Check className="h-5 w-5" />
                  Claimed!
                </>
              ) : (
                <>
                  <Coins className="h-5 w-5" />
                  Claim {DAILY_STAKE_MON} MON Stake Back on Monad
                </>
              )}
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={resetQuiz}>
              <RotateCcw className="h-4 w-4" />
              Restart Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
