"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Home, BookOpen, Award, Swords, User, Map, Zap } from "lucide-react";
import { useAccount } from "wagmi";
import { WalletButton } from "@/components/wallet-button";
import { Mascot } from "@/components/mascot";
import { spring } from "@/components/motion";
import { useOnchainUser, usePractice } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Daily", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Map },
  { href: "/duel", label: "Duel", icon: Swords },
  { href: "/exam", label: "Test", icon: Award },
  { href: "/profile", label: "Profile", icon: User },
];

const isActive = (pathname: string | null, href: string) =>
  href === "/" ? pathname === "/" : pathname?.startsWith(href);

export function Navbar() {
  const pathname = usePathname();
  const { user } = useOnchainUser();
  const streak = user?.streak ?? 0;
  const { address } = useAccount();
  const { data: practice } = usePractice(address);

  return (
    <>
      <motion.header
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={spring}
        className="sticky top-0 z-40 w-full border-b border-monad-800/60 bg-[#0b0620]/80 backdrop-blur-xl"
      >
        <div className="container flex h-16 max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <motion.div whileHover={{ rotate: [0, -12, 12, 0], transition: { duration: 0.5 } }}>
              <Mascot size={40} float={false} />
            </motion.div>
            <span className="metal-text hidden text-xl font-black tracking-tight sm:inline md:hidden lg:inline">
              Moningo
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors lg:text-sm",
                    active ? "text-white" : "text-monad-300/80 hover:text-monad-100"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-xl border border-monad/40 bg-monad/20 shadow-[0_0_20px_-4px_rgba(131,110,249,0.6)]"
                      transition={spring}
                    />
                  )}
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {practice && (
              <Link
                href="/practice"
                title="Practice energy"
                className="flex items-center gap-0.5 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2.5 py-1.5 text-sm font-black text-yellow-300 transition-colors hover:bg-yellow-300/20"
              >
                <Zap className="h-4 w-4 fill-yellow-300" />
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={practice.energy}
                    initial={{ y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 12, opacity: 0 }}
                  >
                    {practice.energy}
                  </motion.span>
                </AnimatePresence>
              </Link>
            )}
            <Link
              href="/streak"
              title="Streak tree"
              className="flex items-center gap-1 rounded-full border border-flame/30 bg-flame/10 px-3 py-1.5 text-sm font-black text-flame transition-colors hover:bg-flame/20"
            >
              <motion.span
                animate={streak > 0 ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : {}}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
              >
                <Flame className="h-4 w-4 fill-flame" />
              </motion.span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={streak}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                >
                  {streak}
                </motion.span>
              </AnimatePresence>
            </Link>
            <WalletButton />
          </div>
        </div>
      </motion.header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-monad-800/60 bg-[#0b0620]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase"
            >
              {active && (
                <motion.span
                  layoutId="tab-dot"
                  className="absolute top-0 h-1 w-10 rounded-b-full bg-monad"
                  transition={spring}
                />
              )}
              <motion.span
                animate={{ scale: active ? 1.15 : 1, y: active ? -1 : 0 }}
                transition={spring}
              >
                <Icon className={cn("h-5 w-5", active ? "text-monad" : "text-monad-300/70")} />
              </motion.span>
              <span className={active ? "text-monad" : "text-monad-300/70"}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
