import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten an Ethereum address: 0x1234…abcd */
export function shortAddress(address?: string | null): string {
  if (!address) return "";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Parse a possibly-string number from backend into a JS number. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof value === "bigint") return Number(value);
  return fallback;
}

/** Format MON (18 decimals) amount from a bigint or decimal string. */
export function formatMon(value: bigint | string | number | null | undefined, digits = 4): string {
  if (value === null || value === undefined) return "0";
  try {
    if (typeof value === "bigint") {
      const whole = value / 10n ** 18n;
      const fraction = value % 10n ** 18n;
      const fracStr = fraction.toString().padStart(18, "0").slice(0, digits);
      return `${whole.toString()}.${fracStr}`;
    }
    if (typeof value === "string") {
      // already in ether (backend returns formatted strings)
      return Number(value).toFixed(digits);
    }
    if (typeof value === "number") return value.toFixed(digits);
  } catch {
    return "0";
  }
  return "0";
}
