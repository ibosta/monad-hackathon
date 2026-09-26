"use client";

import { useAccount, useBalance, useConnect, useDisconnect, useChainId } from "wagmi";
import { useConnectModal } from "wagmi/connectors";
import { useEffect, useState } from "react";
import { Wallet, LogOut, Zap, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, shortAddress, formatMon } from "@/lib/utils";
import { MONAD_CHAIN_ID } from "@/lib/wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useConnectModal();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data: balanceData } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const wrongNetwork = mounted && isConnected && chainId !== MONAD_CHAIN_ID;

  if (!mounted) {
    return (
      <Button variant="outline" size="default" disabled className="w-[140px]">
        <Wallet className="h-4 w-4" />
        Connect
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button variant="flame" onClick={() => open()} className="w-full sm:w-auto">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  if (wrongNetwork) {
    return (
      <Button
        variant="destructive"
        onClick={() => open()}
        className="w-full sm:w-auto"
      >
        <AlertTriangle className="h-4 w-4" />
        Wrong Network
      </Button>
    );
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-monad/30 bg-monad/10 px-4 py-2.5 text-sm font-medium text-monad transition-colors hover:bg-monad/20",
          "sm:w-auto glow-monad"
        )}
      >
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 fill-monad" />
          <span className="font-mono">
            {formatMon(balanceData?.value ?? 0n, 3)} MON
          </span>
        </span>
        <span className="flex items-center gap-1.5 border-l border-monad/20 pl-2.5 font-mono text-xs text-foreground/80">
          {shortAddress(address)}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-2xl animate-pop">
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">Connected wallet</p>
              <p className="truncate font-mono text-sm text-foreground">
                {address}
              </p>
            </div>
            <div className="mx-1.5 my-1 h-px bg-border" />
            <button
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
