"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, Flame, Sparkles, BookOpen, Award, Swords } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { CertificateCard } from "@/components/certificate-card";
import { BadgeCollection } from "@/components/badges";
import { CountUp, Stagger, StaggerItem, spring } from "@/components/motion";
import { WalletButton } from "@/components/wallet-button";
import { api } from "@/lib/api";
import { LEVEL_NAMES } from "@/lib/contract";
import { useMonBalance, useOnchainUser } from "@/hooks/use-moningo";
import { formatMon, shortAddress } from "@/lib/utils";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const { user } = useOnchainUser();
  const { data: balance } = useMonBalance();
  const { data: me } = useQuery({
    queryKey: ["user", address],
    queryFn: () => api.user(address!),
    enabled: Boolean(address),
  });
  const { data: certs, isLoading } = useQuery({
    queryKey: ["certificates", address, user?.certificateId],
    queryFn: () => api.certificates(address!),
    enabled: Boolean(address),
  });
  const { data: duels } = useQuery({
    queryKey: ["duel-stats", address],
    queryFn: () => api.duelStats(address!),
    enabled: Boolean(address),
  });

  if (!mounted) return null;
  if (!isConnected || !address) {
    return (
      <section className="metal-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <Mascot size={140} />
        <h1 className="metal-text text-3xl font-black">Connect to see your profile</h1>
        <WalletButton />
      </section>
    );
  }

  const level = user?.level ? LEVEL_NAMES[user.level] : null;

  return (
    <Stagger className="space-y-6">
      <StaggerItem>
        <section className="metal-card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-full bg-gradient-to-br from-monad-300 via-monad to-berry p-1">
              <div className="rounded-full bg-[#140a33] p-2">
                <Mascot size={96} float={false} mood="happy" />
              </div>
            </div>
            {level && (
              <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#0b0620] bg-monad px-2 py-0.5 text-xs font-black text-white">
                {level}
              </span>
            )}
          </motion.div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-widest text-monad-300">
              Learner
            </p>
            <button
              onClick={() =>
                navigator.clipboard.writeText(address).then(() => toast.success("Address copied"))
              }
              className="group flex items-center gap-2 font-mono text-lg font-bold text-white"
            >
              {shortAddress(address)}
              <Copy className="h-4 w-4 opacity-50 group-hover:opacity-100" />
            </button>
            <p className="text-monad-200">{balance ? `${formatMon(balance.value, 3)} MON` : "…"}</p>
          </div>
        </section>
      </StaggerItem>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          icon={<Flame className="h-5 w-5 fill-flame text-flame" />}
          label="Streak"
          value={user?.streak ?? 0}
        />
        <Stat
          icon={<Sparkles className="h-5 w-5 text-yellow-300" />}
          label="XP"
          value={me?.totalScore ?? 0}
        />
        <Stat
          icon={<BookOpen className="h-5 w-5 text-duo" />}
          label="Lessons"
          value={me?.lessonsCompleted ?? 0}
        />
        <Stat
          icon={<Swords className="h-5 w-5 text-berry-400" />}
          label="Duels won"
          value={duels?.wins ?? 0}
        />
      </section>

      <StaggerItem>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">🏅 Achievement NFTs</h2>
          <Link href="/streak" className="text-sm font-bold text-monad-300 hover:text-white">
            Streak tree →
          </Link>
        </div>
        <BadgeCollection address={address} />
      </StaggerItem>

      <StaggerItem>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-black text-white">
            <Award className="h-6 w-6 text-monad" /> Certificates
          </h2>
          <Link href="/verify" className="text-sm font-bold text-monad-300 hover:text-white">
            Verify any certificate →
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="metal-card aspect-[3/2] animate-pulse" />
            ))}
          </div>
        ) : certs?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {certs.map((c, i) => (
              <CertificateCard key={c.tokenId} cert={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="metal-card flex flex-col items-center gap-3 p-8 text-center">
            <Mascot size={100} mood="think" />
            <p className="text-monad-100/80">
              No certificates yet. Take the level test to mint your first on-chain certificate.
            </p>
            <Link href="/exam" className="btn-berry">
              Take level test
            </Link>
          </div>
        )}
      </StaggerItem>
    </Stagger>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <StaggerItem hover className="metal-card p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-monad-300">
        {icon}
        {label}
      </div>
      <CountUp value={value} className="mt-1 block text-3xl font-black text-white" />
    </StaggerItem>
  );
}
