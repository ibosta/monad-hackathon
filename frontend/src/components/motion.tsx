"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export const spring = { type: "spring", stiffness: 380, damping: 28 } as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

/** Children wrapped in <StaggerItem> animate in one after another. */
export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      variants={item}
      className={className}
      whileHover={hover ? { y: -4, transition: spring } : undefined}
    >
      {children}
    </motion.div>
  );
}

/** Animated number that counts up when it scrolls into view or changes. */
export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => v.toFixed(decimals));
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [inView, value, mv]);
  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

const COLORS = ["#836EF9", "#DDD7FE", "#A0055D", "#58CC02", "#FFB547", "#ffffff"];

/** Lightweight confetti burst: DOM particles animated by framer-motion. */
export function Confetti({ fire, count = 70 }: { fire: unknown; count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${String(fire)}-${i}`,
        x: (Math.random() - 0.5) * 900,
        y: -(Math.random() * 500 + 150),
        rotate: Math.random() * 720 - 360,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
        round: Math.random() > 0.5,
        delay: Math.random() * 0.15,
      })),
    [fire, count]
  );
  if (!fire) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={cn("absolute", p.round ? "rounded-full" : "rounded-sm")}
          style={{ width: p.size, height: p.size * (p.round ? 1 : 0.5), background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 900], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{
            duration: 2.2,
            delay: p.delay,
            ease: [0.2, 0.7, 0.4, 1],
            times: [0, 0.35, 1],
          }}
        />
      ))}
    </div>
  );
}

/** Horizontal slide used between questions. */
export const slide: Variants = {
  enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: spring },
  exit: (dir: number) => ({ x: dir * -80, opacity: 0, transition: { duration: 0.15 } }),
};

export const shake = { x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } };
export const pop = { scale: [1, 1.06, 1], transition: { duration: 0.3 } };
