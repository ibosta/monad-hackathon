"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ShieldCheck, ShieldX, Search } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { CertificateCard } from "@/components/certificate-card";
import { spring } from "@/components/motion";
import { api, type CertificateInfo } from "@/lib/api";
import { shortAddress } from "@/lib/utils";

/** Public page: anyone can verify a Moningo certificate by token id (shareable ?id= link). */
export default function VerifyPage() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(CertificateInfo & { valid: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (tokenId: string) => {
    const n = Number(tokenId);
    if (!Number.isInteger(n) || n < 1) return setError("Enter a valid certificate (token) id");
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.certificate(n));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("id");
    if (q) {
      setId(q);
      lookup(q);
    }
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section className="metal-card flex flex-col items-center gap-4 p-8 text-center">
        <Mascot size={110} mood="think" />
        <h1 className="metal-text text-3xl font-black">Verify a certificate</h1>
        <p className="text-monad-100/80">Every Moningo certificate is a soulbound NFT on Monad. Enter its id to check it on-chain.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.history.replaceState(null, "", `/verify?id=${id}`);
            lookup(id);
          }}
          className="flex w-full gap-2"
        >
          <input
            value={id}
            onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Certificate id, e.g. 1"
            className="flex-1 rounded-2xl border-2 border-monad-700 bg-monad-900/60 px-4 py-3 font-bold text-white outline-none placeholder:text-monad-400 focus:border-monad"
          />
          <button type="submit" disabled={loading} className="btn-monad px-4">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </button>
        </form>
      </section>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div key={result.tokenId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-duo/40 bg-duo/10 p-4">
              <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 }}>
                <ShieldCheck className="h-8 w-8 text-duo" />
              </motion.span>
              <div className="text-left">
                <p className="font-black text-duo">Valid on-chain certificate</p>
                <p className="text-sm text-monad-100">
                  Owned by <span className="font-mono">{shortAddress(result.owner)}</span> · Level {result.level}
                </p>
              </div>
            </div>
            <CertificateCard cert={result} actions={false} />
            <p className="break-all text-center text-xs text-monad-300">Contract {result.contract}</p>
          </motion.div>
        )}
        {error && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -8, 8, 0] }} className="flex items-center gap-3 rounded-2xl border border-duo-red/40 bg-duo-red/10 p-4">
            <ShieldX className="h-8 w-8 text-duo-red" />
            <p className="font-bold text-duo-red">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
