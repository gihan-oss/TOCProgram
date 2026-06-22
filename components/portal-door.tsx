"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DoorOpen, ArrowRight } from "lucide-react";

// The "Launch the portal" call-to-action — branded for Amal & Company — that
// opens the portal with a double-door reveal: deep-navy doors split apart from
// a glowing seam to admit you, then we navigate in. Honors reduced-motion.

// Brand purple (matches the portal's --primary / --accent), no blue.
const PURPLE_DK = "#241f5c"; // deep
const PURPLE_DK2 = "#352c86"; // mid
const PURPLE = "#6d5efc"; // bright accent
const PURPLE_LT = "#b9aaff"; // light lavender (spark core — no white, so it doesn't clash with the white logo)

export function PortalDoor({ href = "/login" }: { href?: string }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  useEffect(() => { router.prefetch(href); }, [href, router]);

  function launch() {
    if (opening) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { router.push(href); return; }
    setOpening(true);
    setTimeout(() => router.push(href), 1850);
  }

  return (
    <>
      <button
        onClick={launch}
        disabled={opening}
        className="group inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-xl transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-90"
        style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DK})`, boxShadow: `0 12px 34px -12px ${PURPLE_DK}, 0 0 0 1px rgba(255,255,255,0.08) inset` }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.16)" }}>
          <DoorOpen className="h-5 w-5 text-white" />
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
    background: `linear-gradient(90deg, ${PURPLE_DK} 0%, ${PURPLE_DK2} 100%)`,
    backfaceVisibility: "hidden",
  };
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden animate-overlay-out" aria-hidden>
      {/* Bright interior behind the doors (no logo — a single mark only) */}
      <div className="absolute inset-0 bg-background animate-interior-in">
        <div className="mesh absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${PURPLE}55, transparent)` }} />
      </div>

      {/* The two purple doors */}
      <div className="absolute inset-0" style={{ perspective: 1800 }}>
        <div className="absolute inset-y-0 left-0 w-1/2 origin-left animate-door-l shadow-2xl" style={doorBase}>
          <div className="absolute inset-y-0 right-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${PURPLE}, transparent)` }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.35), transparent)" }} />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 origin-right animate-door-r shadow-2xl" style={doorBase}>
          <div className="absolute inset-y-0 left-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${PURPLE}, transparent)` }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.35), transparent)" }} />
        </div>
      </div>

      {/* Subtle purple parting glow where the doors meet (no white, no sparks) */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 animate-seam-flash" style={{ background: `linear-gradient(to bottom, transparent, ${PURPLE}, transparent)`, boxShadow: `0 0 22px 3px ${PURPLE}` }} />

      {/* The white logo, with an ELECTRIC purple loop doodled around it — a glowing
          path draws around the logo and a bright spark races along it. The energy
          is around the logo (not through it), so nothing clashes. */}
      <div className="absolute inset-0 flex items-center justify-center animate-brand-out">
        <div className="relative">
          <svg viewBox="0 0 360 180" className="absolute left-1/2 top-1/2 h-[150px] w-[330px] -translate-x-1/2 -translate-y-1/2 overflow-visible" fill="none" style={{ filter: `drop-shadow(0 0 5px ${PURPLE})` }} aria-hidden>
            <path pathLength={100} className="animate-doodle-draw" d="M186 20 C90 12 28 44 24 88 C20 132 110 156 196 152 C302 150 346 114 334 80 C324 48 266 26 186 20" stroke={PURPLE} strokeWidth={3} strokeLinecap="round" transform="rotate(-3 180 90)" />
            <path pathLength={100} className="animate-doodle-race" style={{ strokeDasharray: "5 95" }} d="M186 20 C90 12 28 44 24 88 C20 132 110 156 196 152 C302 150 346 114 334 80 C324 48 266 26 186 20" stroke={PURPLE_LT} strokeWidth={3.5} strokeLinecap="round" transform="rotate(-3 180 90)" />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src="/logo-white.png" alt="Amal & Company" width={260} height={84} className="animate-logo-draw relative h-14 w-auto object-contain" priority />
        </div>
      </div>
    </div>
  );
}
