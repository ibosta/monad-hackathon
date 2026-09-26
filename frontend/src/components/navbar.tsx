"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Flame, GraduationCap } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";

export function Navbar({ streak }: { streak?: number }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-monad to-monad-600 shadow-lg shadow-monad/30 transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Moningo
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              Learn & Stake
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/" active={pathname === "/"}>
            <GraduationCap className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink href="/learn" active={pathname?.startsWith("/learn") ?? false}>
            <Flame className="h-4 w-4" />
            Learn
          </NavLink>
        </nav>

        {/* Streak + wallet */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-flame/30 bg-flame/10 px-3 py-1.5 text-sm font-semibold text-flame glow-flame">
            <Flame className="h-4 w-4 fill-flame" />
            <span>{streak ?? 0}</span>
            <span className="hidden text-xs font-normal text-flame/70 sm:inline">
              day streak
            </span>
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
