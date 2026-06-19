"use client";

import { useMemo } from "react";

// A tiny dependency-free confetti burst. Mount it (e.g. {show && <Confetti/>})
// and unmount after ~1.8s. Pointer-events are off so it never blocks the UI.
const COLORS = ["#6d5efc", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];

export function Confetti({ count = 44 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dur: 1.3 + Math.random() * 0.9,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        round: Math.random() > 0.6,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "1px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
