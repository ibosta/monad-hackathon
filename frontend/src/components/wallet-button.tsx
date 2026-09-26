"use client";

import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { useEffect, useState } from "react";
import { Wallet, LogOut, Zap, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, shortAddress, formatMon } from "@/lib/utils";
import { MONAD_CHAIN_ID } from "@/lib/wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const { data: balanceData } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const wrongNetwork = mounted && isConnected && chainId !== MONAD_CHAIN_ID;

  const handleConnect = async (connector: Connector) => {
    setConnectingId(connector.uid);
    try {
      await connectAsync({ connector });
      setPickerOpen(false);
    } catch (e) {
      console.error("connect failed", e);
    } finally {
      setConnectingId(null);
    }
  };

  // Deduplicate connectors by name (multi-injected discovery can create dups)
  const uniqueConnectors = connectors.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i
  );

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
      <>
        <button onClick={() => setPickerOpen(true)} className="btn-monad px-4 py-2 text-xs">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
        </button>
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-monad" />
                Connect a wallet
              </DialogTitle>
              <DialogDescription>
                Choose a wallet to connect to Monad Testnet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {uniqueConnectors.length === 0 && (
                <p className="rounded-xl border border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                  No wallet detected. Install{" "}
                  <a
                    href="https://metamask.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-monad hover:underline"
                  >
                    MetaMask
                  </a>{" "}
                  or another EVM wallet.
                </p>
              )}
              {uniqueConnectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-left text-sm font-medium transition-all hover:border-monad/40 hover:bg-secondary disabled:opacity-50"
                >
                  <span>{connector.name}</span>
                  {connectingId === connector.uid ? (
                    <Loader2 className="h-4 w-4 animate-spin text-monad" />
                  ) : (
                    <ChevronDown className="h-4 w-4 -rotate-90 opacity-40" />
                  )}
                </button>
              ))}
              {connectError && (
                <p className="text-sm text-destructive">
                  {connectError.message || "Connection failed."}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (wrongNetwork) {
    return (
      <button onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })} disabled={switching} className="btn-berry px-4 py-2 text-xs">
        {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        Switch to Monad
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border border-monad/30 bg-monad/10 px-4 py-2.5 text-sm font-medium text-monad transition-colors hover:bg-monad/20",
          "sm:w-auto glow-monad"
        )}
      >
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 fill-monad" />
          <span className="font-mono">
            {formatMon(balanceData?.value ?? 0n, 2)} <span className="hidden sm:inline">MON</span>
          </span>
        </span>
        <span className="hidden items-center gap-1.5 border-l border-monad/20 pl-2.5 font-mono text-xs text-foreground/80 sm:flex">
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
