import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Moningo ⚡ Learn & Stake",
  description:
    "Stake 0.1 MON on Monad Testnet, complete daily English lessons, and earn your stake back plus rewards. Build your streak and claim an on-chain certificate.",
  keywords: ["Monad", "English", "streak", "stake", "Web3", "learn", "MON"],
  authors: [{ name: "Moningo" }],
  openGraph: {
    title: "Moningo ⚡ Learn & Stake",
    description: "Stake MON, learn English daily, earn rewards on Monad Testnet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-950 text-foreground antialiased`}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none fixed inset-0 grid-bg" />
            <div className="relative z-10 flex flex-1 flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
                <p>
                  Moningo ⚡ — Built for{" "}
                  <a
                    href="https://testnet.monadexplorer.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-monad hover:underline"
                  >
                    Monad Testnet
                  </a>{" "}
                  · 0.4s blocks · Stake. Learn. Earn.
                </p>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
