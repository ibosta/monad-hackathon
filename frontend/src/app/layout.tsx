import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], display: "swap" });

export const metadata: Metadata = {
  title: "Moningo · Learn English, earn MON",
  description: "Stake MON, finish daily English lessons, earn MON back and mint an on-chain CEFR certificate NFT on Monad.",
};

export const viewport: Viewport = { themeColor: "#0b0620", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${nunito.className} min-h-screen antialiased`}>
        <Providers>
          <Navbar />
          <main className="container max-w-5xl pb-28 pt-6 md:pb-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
