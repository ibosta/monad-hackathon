"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";
import { Volume2 } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot";
import { shake, slide, spring } from "@/components/motion";

export type Question = {
  id: number;
  type: string;
  question: string;
  options: string[];
  speak?: string;
};

export const TYPE_LABEL: Record<string, string> = {
  vocabulary: "📚 New word",
  grammar: "✏️ Grammar",
  translation: "🌍 Translate",
  idiom: "💬 Idiom",
  listening: "🎧 Listen & choose",
  emoji: "🖼️ What is this?",
  synonym: "🔁 Synonym",
  spelling: "🔤 Spelling",
  preposition: "📍 Preposition",
  phrasal: "🧩 Phrasal verb",
};

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

/**
 * Animated question: slides in, options stagger, wrong answer shakes.
 * `states` maps option -> "selected" | "correct" | "wrong".
 */
export function QuestionCard({
  q,
  direction = 1,
  mood,
  states,
  disabled,
  onSelect,
  wrongPulse,
}: {
  q: Question;
  direction?: number;
  mood: MascotMood;
  states: Record<string, string | undefined>;
  disabled?: boolean;
  onSelect: (o: string) => void;
  wrongPulse?: unknown;
}) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (wrongPulse) controls.start(shake);
  }, [wrongPulse, controls]);
  useEffect(() => {
    if (q.speak) speak(q.speak);
  }, [q.id, q.speak]);

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={q.id}
        custom={direction}
        variants={slide}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-monad-300">
          {TYPE_LABEL[q.type] ?? q.type}
        </p>
        <div className="mb-6 flex items-end gap-3">
          <motion.div
            key={mood}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1, y: mood === "cheer" ? [0, -14, 0] : 0 }}
            transition={spring}
          >
            <Mascot size={90} mood={mood} float={false} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, originX: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.08 }}
            className="relative flex-1 rounded-2xl border-2 border-monad-700 bg-monad-900/60 p-4 text-lg font-extrabold text-white sm:text-xl"
          >
            <span className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-b-2 border-l-2 border-monad-700 bg-[#170d3a]" />
            {q.speak && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => speak(q.speak!)}
                className="mb-2 mr-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-monad text-white shadow-[0_4px_0_0_#3b2a8f]"
                aria-label="Play audio"
              >
                <Volume2 className="h-6 w-6" />
              </motion.button>
            )}
            {q.question}
          </motion.div>
        </div>

        <motion.div animate={controls} className="grid gap-3">
          {q.options.map((o, i) => (
            <motion.button
              key={o}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, scale: states[o] === "correct" ? [1, 1.04, 1] : 1 }}
              transition={{ ...spring, delay: 0.12 + i * 0.05 }}
              whileTap={disabled ? undefined : { scale: 0.97, y: 3 }}
              disabled={disabled}
              onClick={() => onSelect(o)}
              className="option-tile flex items-center gap-3"
              data-state={states[o]}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current/30 text-xs opacity-70">
                {i + 1}
              </span>
              {o}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Slide-up feedback / action bar, Duolingo style. */
export function ActionBar({
  feedback,
  children,
}: {
  feedback: { correct: boolean; text: string } | null;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      className={
        "sticky bottom-16 mt-8 rounded-2xl p-4 transition-colors md:bottom-4 " +
        (feedback ? (feedback.correct ? "bg-duo/15" : "bg-duo-red/15") : "bg-transparent")
      }
    >
      <AnimatePresence>
        {feedback && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className={
              "mb-3 text-lg font-black " + (feedback.correct ? "text-duo" : "text-duo-red")
            }
          >
            {feedback.text}
          </motion.p>
        )}
      </AnimatePresence>
      {children}
    </motion.div>
  );
}
