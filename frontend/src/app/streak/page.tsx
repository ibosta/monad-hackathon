"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Flame, Gift, Check, Lock, Loader2 } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Modal } from "@/components/modal";
import { Confetti, CountUp, spring } from "@/components/motion";
import { WalletButton } from "@/components/wallet-button";
import { api, type StreakTree } from "@/lib/api";
import { streakAbi } from "@/lib/games-abi";
import { withTxToast } from "@/lib/tx-toast";
import { useChainTx } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const CLAIM_GAS = 150_000n;
type Node = StreakTree["milestones"][number];

/** The streak tree: a trunk that grows with your streak; milestone fruits pay growing MON bonuses. */
export default function StreakPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const send = useChainTx();
  const { data: tree, refetch } = useQuery({
    queryKey: ["streak-tree", address],
    queryFn: () => api.streakTree(address!),
    enabled: Boolean(address),
  });
  const [open, setOpen] = useState<Node | null>(null);
  const [busy, setBusy] = useState(false);
  const [fired, setFired] = useState<string | null>(null);

  if (!mounted) return null;
  if (!isConnected || !address) {
    return (
      <section className="metal-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <Mascot size={140} />
        <h1 className="metal-text text-3xl font-black">Connect to grow your streak tree</h1>
        <WalletButton />
      </section>
    );
  }
  if (!tree)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-monad" />
      </div>
    );

  const claim = async (n: Node) => {
    setBusy(true);
    try {
      const tx = await withTxToast(`Claim day ${n.day} bonus`, () =>
        send({
          address: tree.contract as `0x${string}`,
          abi: streakAbi,
          functionName: "claim",
          args: [BigInt(n.day)],
          gas: CLAIM_GAS,
        })
      );
      setFired(tx.hash);
      setOpen(null);
      await refetch();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const ms = tree.milestones;
  const top = ms[ms.length - 1]?.day ?? 100;
  const growth = Math.min(1, tree.streak / top);
  const claimable = ms.filter((m) => m.reached && !m.claimed);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Confetti fire={fired} />

      {/* Goal header */}
      <section className="metal-card flex items-center gap-4 p-5">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-flame/15"
        >
          <Flame className="h-9 w-9 fill-flame text-flame" />
        </motion.div>
        <div className="flex-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-monad-300">
            Current streak
          </p>
          <p className="text-3xl font-black text-white">
            <CountUp value={tree.streak} /> <span className="text-lg text-monad-200">days</span>
          </p>
          {tree.next ? (
            <>
              <p className="text-sm font-bold text-monad-100">
                {tree.daysToNext} more day{tree.daysToNext === 1 ? "" : "s"} →{" "}
                <span className="text-yellow-300">+{tree.next.reward} MON</span> at day{" "}
                {tree.next.day}
              </p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-monad-900">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-flame to-yellow-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, (tree.streak / tree.next.day) * 100)}%` }}
                  transition={{ ...spring, delay: 0.2 }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm font-bold text-yellow-300">You reached the top of the tree! 🏆</p>
          )}
        </div>
      </section>

      {claimable.length > 0 && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setOpen(claimable[0])}
          className="btn-green w-full"
        >
          <Gift className="h-5 w-5" /> {claimable.length} bonus{claimable.length > 1 ? "es" : ""}{" "}
          ready to claim
        </motion.button>
      )}

      {/* The tree */}
      <section className="metal-card relative overflow-hidden px-4 pb-10 pt-6">
        <p className="mb-4 text-center text-sm font-bold text-monad-200">
          Every day you finish the daily quest earns{" "}
          <b className="text-white">{tree.dailyReward} MON</b> today, and the daily reward grows
          with your streak. Milestones add a one-time bonus on top. Tap a fruit.
        </p>
        <div className="relative mx-auto" style={{ height: ms.length * 92 + 60 }}>
          {/* trunk */}
          <div
            className="absolute bottom-0 left-1/2 w-5 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#3b2a8f] to-[#5b45d6]"
            style={{ top: 30 }}
          />
          <motion.div
            className="absolute bottom-0 left-1/2 w-5 -translate-x-1/2 rounded-full bg-gradient-to-t from-flame to-yellow-300 shadow-[0_0_24px_rgba(249,115,22,0.6)]"
            initial={{ height: 0 }}
            animate={{ height: `calc(${growth * 100}% - ${growth * 30}px)` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          {ms.map((m, i) => {
            const left = i % 2 === 0;
            const bottom = 30 + i * 92;
            return (
              <div key={m.day} className="absolute left-0 right-0" style={{ bottom }}>
                {/* branch */}
                <div
                  className={cn(
                    "absolute top-7 h-2 w-[28%] rounded-full",
                    left ? "right-1/2" : "left-1/2",
                    m.reached ? "bg-flame/70" : "bg-monad-800"
                  )}
                />
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, delay: 0.15 + i * 0.06 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setOpen(m)}
                  className={cn(
                    "absolute flex w-[42%] items-center gap-3 rounded-2xl border-2 p-3 text-left",
                    left ? "right-[64%] flex-row-reverse text-right" : "left-[64%]",
                    m.claimed
                      ? "border-monad-700 bg-monad-900/70"
                      : m.reached
                        ? "border-yellow-300 bg-yellow-300/10 shadow-[0_0_24px_-4px_rgba(253,224,71,0.6)]"
                        : "border-monad-800 bg-monad-900/40"
                  )}
                >
                  <motion.span
                    animate={m.reached && !m.claimed ? { rotate: [0, -10, 10, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0.8 }}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                      m.reached ? "bg-gradient-to-br from-monad-300 to-berry" : "bg-monad-800"
                    )}
                  >
                    {m.claimed ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : m.reached ? (
                      "🍇"
                    ) : (
                      <Lock className="h-4 w-4 text-monad-400" />
                    )}
                  </motion.span>
                  <span>
                    <span className="block text-sm font-black text-white">Day {m.day}</span>
                    <span
                      className={cn(
                        "block text-xs font-bold",
                        m.reached ? "text-yellow-300" : "text-monad-300"
                      )}
                    >
                      +{m.reward} MON
                    </span>
                  </span>
                </motion.button>
              </div>
            );
          })}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6">
            <Mascot size={70} float={false} mood={tree.streak > 0 ? "happy" : "think"} />
          </div>
        </div>
      </section>

      <Modal open={Boolean(open)} onClose={() => setOpen(null)}>
        {open && (
          <>
            <span className="text-5xl">{open.claimed ? "✅" : open.reached ? "🍇" : "🌱"}</span>
            <h2 className="metal-text text-2xl font-black">Day {open.day} milestone</h2>
            <DayBreakdown
              day={open.day}
              daily={Number(open.dailyReward)}
              bonus={Number(open.reward)}
            />
            {open.claimed ? (
              <p className="font-bold text-duo">Already claimed</p>
            ) : open.reached ? (
              <button onClick={() => claim(open)} disabled={busy} className="btn-green w-full">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}{" "}
                Claim +{open.reward} MON
              </button>
            ) : (
              <>
                <p className="text-monad-100">
                  {open.day - tree.streak} more day{open.day - tree.streak === 1 ? "" : "s"} to
                  unlock.
                </p>
                <Link href="/learn" className="btn-monad w-full">
                  Do today&apos;s quest
                </Link>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

function DayBreakdown({ day, daily, bonus }: { day: number; daily: number; bonus: number }) {
  return (
    <div className="w-full space-y-1 rounded-2xl bg-monad-900/60 p-4 text-sm font-bold">
      <Row k={`Daily quest reward on day ${day}`} v={`+${daily} MON`} />
      <Row k="Milestone bonus" v={`+${bonus} MON`} gold />
      <div className="my-1 h-px bg-monad-700" />
      <Row k={`You earn on day ${day}`} v={`+${(daily + bonus).toFixed(3)} MON`} big />
      <Row k="Daily reward from then on" v={`${daily} MON / day`} />
    </div>
  );
}

function Row({ k, v, gold, big }: { k: string; v: string; gold?: boolean; big?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-left text-monad-200">{k}</span>
      <span
        className={cn(
          "whitespace-nowrap",
          gold ? "text-yellow-300" : "text-white",
          big && "text-base font-black"
        )}
      >
        {v}
      </span>
    </div>
  );
}
