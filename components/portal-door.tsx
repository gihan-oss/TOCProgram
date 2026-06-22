"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DoorOpen, ArrowRight } from "lucide-react";

// The "Launch the portal" call-to-action — branded for Amal & Company — that
// opens the portal with a double-door reveal: deep-navy doors split apart from
// a glowing seam to admit you, then we navigate in. Honors reduced-motion.

const NAVY = "#0e1a33";
const NAVY_2 = "#1d2c4f";
const SKY = "#8ec5e0"; // Amal & Company light blue

export function PortalDoor({ href = "/login" }: { href?: string }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  useEffect(() => { router.prefetch(href); }, [href, router]);

  function launch() {
    if (opening) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { router.push(href); return; }
    setOpening(true);
    setTimeout(() => router.push(href), 1500);
  }

  return (
    <>
      <button
        onClick={launch}
        disabled={opening}
        className="group inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-xl transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-90"
        style={{ background: `linear-gradient(135deg, ${NAVY_2}, ${NAVY})`, boxShadow: `0 12px 34px -12px ${NAVY}, 0 0 0 1px rgba(255,255,255,0.06) inset` }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
          <DoorOpen className="h-5 w-5" style={{ color: SKY }} />
        </span>
        <span>Launch the portal</span>
        <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {/* Rendered through a portal to <body> so the full-screen overlay isn't
          trapped by the hero's transformed (animate-fade-up) ancestor. */}
      {opening && typeof document !== "undefined" && createPortal(<DoorReveal />, document.body)}
    </>
  );
}

function DoorReveal() {
  const doorBase: React.CSSProperties = {
    background: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY_2} 100%)`,
    backfaceVisibility: "hidden",
  };
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden animate-overlay-out" aria-hidden>
      {/* Bright interior behind the doors (no logo — keeps it to a single mark) */}
      <div className="absolute inset-0 bg-background animate-interior-in">
        <div className="mesh absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${SKY}55, transparent)` }} />
      </div>

      {/* The two doors */}
      <div className="absolute inset-0" style={{ perspective: 1800 }}>
        <div className="absolute inset-y-0 left-0 w-1/2 origin-left animate-door-l shadow-2xl" style={doorBase}>
          <div className="absolute inset-y-0 right-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${SKY}, transparent)` }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.35), transparent)" }} />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 origin-right animate-door-r shadow-2xl" style={doorBase}>
          <div className="absolute inset-y-0 left-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${SKY}, transparent)` }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.35), transparent)" }} />
        </div>
      </div>

      {/* Glowing seam flash as the doors part */}
      <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 animate-seam-flash" style={{ background: `linear-gradient(to bottom, transparent, ${SKY}, #fff, ${SKY}, transparent)`, boxShadow: `0 0 40px 8px ${SKY}` }} />

      {/* Single transparent logo, "doodled" — a hand-drawn loop sketches around it,
          then it fades as the doors open. */}
      <div className="absolute inset-0 flex items-center justify-center animate-brand-out">
        <div className="relative">
          <svg viewBox="0 0 360 170" className="absolute left-1/2 top-1/2 h-[150px] w-[320px] -translate-x-1/2 -translate-y-1/2" fill="none" aria-hidden>
            <path
              className="animate-draw-doodle"
              d="M188 22 C92 14 30 44 26 86 C22 130 110 152 196 150 C300 148 344 116 332 80 C322 50 268 28 188 22"
              stroke={SKY}
              strokeWidth="3"
              strokeLinecap="round"
              transform="rotate(-3 180 85)"
            />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src="/logo-white.png" alt="Amal & Company" width={220} height={70} className="relative h-12 w-auto object-contain" priority />
        </div>
      </div>
    </div>
  );
}
