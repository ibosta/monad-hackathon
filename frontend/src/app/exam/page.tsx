"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Loader2, ArrowLeft } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Certificate } from "@/components/certificate";
import { TxBadge } from "@/components/tx-badge";
import { WalletButton } from "@/components/wallet-button";
import { api, type ExamResult } from "@/lib/api";
import { EXAM_FEE_MON, EXAM_FEE_WEI, LEVEL_NAMES } from "@/lib/contract";
import { explainError, useMoningoTx, useOnchainUser, type TxResult } from "@/hooks/use-moningo";
import { cn } from "@/lib/utils";

const LEVEL_TEXT: Record<string, string> = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper-intermediate", C1: "Advanced",
};

export default function ExamPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnected } = useAccount();
  const send = useMoningoTx();
  const { user, refetch } = useOnchainUser();
  const { data: exam } = useQuery({ queryKey: ["level-test"], queryFn: api.levelTest });

  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [payTx, setPayTx] = useState<TxResult | null>(null);
  const [mintTx, setMintTx] = useState<TxResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(null);
    }
  }

  const payAndStart = () =>
    run("Paying fee", async () => {
      if (!user?.examPaid) setPayTx(await send("startLevelTest", [], EXAM_FEE_WEI));
      await refetch();
      setAnswers({});
      setIndex(0);
      setStep("quiz");
    });

  const submit = (final: Record<number, string>) =>
    run("Grading", async () => {
      const r = await api.submitLevelTest(address!, final);
      setResult(r);
      setStep("result");
    });

  const mint = () =>
    run("Minting", async () => {
      if (!result?.signature) throw new Error(result?.claimError ?? "No signature");
      setMintTx(await send("claimCertificate", [result.level, result.signature]));
      await refetch();
    });

  if (!mounted) return null;
  if (!isConnected) {
    return (
      <Panel>
        <Mascot size={140} />
        <h1 className="metal-text text-3xl font-black">Connect to take the level test</h1>
        <WalletButton />
      </Panel>
    );
  }
  if (!exam) return <Panel><Loader2 className="h-8 w-8 animate-spin text-monad" /></Panel>;

  const questions = exam.questions;

  if (step === "quiz") {
    const q = questions[index];
    const chosen = answers[q.id];
    const last = index === questions.length - 1;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => (index ? setIndex(index - 1) : setStep("intro"))} className="text-monad-300 hover:text-white" aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-monad-900">
            <div className="h-full rounded-full bg-gradient-to-r from-monad to-berry-400 transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>
          <span className="font-black text-monad-200">{index + 1}/{questions.length}</span>
        </div>
        <div className="flex items-end gap-3">
          <Mascot size={80} mood="think" float={false} />
          <div className="flex-1 rounded-2xl border-2 border-monad-700 bg-monad-900/60 p-4 text-lg font-extrabold text-white sm:text-xl">{q.question}</div>
        </div>
        <div className="grid gap-3">
          {q.options.map((o) => (
            <button key={o} className="option-tile" data-state={chosen === o ? "selected" : undefined} onClick={() => setAnswers({ ...answers, [q.id]: o })}>
              {o}
            </button>
          ))}
        </div>
        <button
          disabled={!chosen || Boolean(busy)}
          onClick={() => (last ? submit(answers) : setIndex(index + 1))}
          className={cn("w-full", last ? "btn-berry" : "btn-monad")}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : last ? "Finish test" : "Next"}
        </button>
        {error && <p className="text-center font-bold text-duo-red">{error}</p>}
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <Panel>
        <Mascot mood={result.level >= 3 ? "cheer" : "happy"} size={130} />
        <p className="text-sm font-extrabold uppercase tracking-widest text-monad-300">Your English level</p>
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-monad-300 via-monad to-monad-800 text-5xl font-black text-white shadow-2xl shadow-monad/50">
          {result.levelName}
        </div>
        <p className="text-xl font-black text-white">{LEVEL_TEXT[result.levelName]}</p>
        <p className="text-monad-200">{result.correct}/{result.total} correct</p>
        {mintTx && user?.certificateId ? (
          <div className="w-full space-y-3">
            <TxBadge tx={mintTx} label="NFT minted" />
            <Certificate tokenId={user.certificateId} />
          </div>
        ) : (
          <button onClick={mint} disabled={Boolean(busy) || !result.signature} className="btn-green w-full sm:w-auto">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {busy}…</> : `Mint ${result.levelName} certificate NFT`}
          </button>
        )}
        {!result.signature && <p className="text-sm text-duo-red">{result.claimError}</p>}
        {error && <p className="font-bold text-duo-red">{error}</p>}
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Panel>
        <Mascot size={150} mood="think" />
        <h1 className="metal-text text-3xl font-black">Level test</h1>
        <p className="text-balance text-monad-100/80">
          10 questions from A1 to C1, graded by the Moningo server. Your level is signed and minted as a{" "}
          <b>soulbound NFT certificate</b> whose image is rendered fully on-chain on Monad.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-sm font-bold">
          {LEVEL_NAMES.slice(1).map((l) => (
            <span key={l} className={cn("rounded-full px-3 py-1", user?.level && LEVEL_NAMES[user.level] === l ? "bg-monad text-white" : "bg-monad-900/70 text-monad-200")}>{l}</span>
          ))}
        </div>
        {payTx && <TxBadge tx={payTx} label="Fee paid" />}
        <button onClick={payAndStart} disabled={Boolean(busy)} className="btn-berry w-full sm:w-auto">
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {busy}…</> : user?.examPaid ? "Resume paid test" : `Pay ${EXAM_FEE_MON} MON & start`}
        </button>
        <p className="text-xs text-monad-300">The fee tops up the daily reward pool for all learners.</p>
        {error && <p className="font-bold text-duo-red">{error}</p>}
      </Panel>
      {user?.certificateId ? (
        <section className="metal-card space-y-3 p-6">
          <h2 className="text-lg font-black text-white">Current certificate</h2>
          <Certificate tokenId={user.certificateId} />
        </section>
      ) : null}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="metal-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">{children}</section>;
}
