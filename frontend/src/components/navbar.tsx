"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Home, BookOpen, Award } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { Mascot } from "@/components/mascot";
import { useOnchainUser } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Daily", icon: BookOpen },
  { href: "/exam", label: "Level Test", icon: Award },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useOnchainUser();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-monad-800/60 bg-[#0b0620]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Mascot size={40} float={false} />
            <span className="metal-text text-xl font-black tracking-tight">Moningo</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold uppercase tracking-wide transition-colors",
                  pathname === href ? "bg-monad/20 text-monad-100" : "text-monad-300/80 hover:bg-monad-900/60 hover:text-monad-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-flame/30 bg-flame/10 px-3 py-1.5 text-sm font-black text-flame">
              <Flame className="h-4 w-4 fill-flame" />
              {user?.streak ?? 0}
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-monad-800/60 bg-[#0b0620]/95 backdrop-blur-xl md:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold uppercase",
              pathname === href ? "text-monad" : "text-monad-300/70"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
