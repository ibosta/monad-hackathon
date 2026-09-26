type AnyErr = {
  code?: number;
  message?: string;
  shortMessage?: string;
  details?: string;
  cause?: unknown;
};

function codesAndText(e: unknown): { codes: number[]; text: string } {
  const codes: number[] = [];
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; cur && i < 6; i++) {
    const c = cur as AnyErr;
    if (typeof c.code === "number") codes.push(c.code);
    parts.push(c.shortMessage ?? "", c.details ?? "", c.message ?? "");
    cur = c.cause;
  }
  return { codes, text: parts.join(" ").toLowerCase() };
}

/** Turns wallet/EIP-1193 errors into a short, human message. Returns null if not wallet-specific. */
export function walletErrorMessage(e: unknown): string | null {
  const { codes, text } = codesAndText(e);
  if (codes.includes(-32002) || text.includes("already pending")) {
    return "A request is already open in your wallet. Open the MetaMask extension and approve or reject it.";
  }
  if (codes.includes(4001) || /user rejected|user denied|rejected the request/.test(text)) {
    return "You cancelled the request in your wallet.";
  }
  if (codes.includes(4902) || text.includes("unrecognized chain")) {
    return "Monad Testnet isn't added to your wallet yet. Approve the 'Add network' prompt.";
  }
  if (text.includes("provider not found") || text.includes("connector not found")) {
    return "No wallet found. Install MetaMask (or another EVM wallet) and refresh.";
  }
  if (text.includes("insufficient")) return "Not enough MON. Grab testnet MON from the faucet.";
  return null;
}
