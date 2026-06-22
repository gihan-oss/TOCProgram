"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DoorOpen, ArrowRight, Loader2 } from "lucide-react";

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
    setTimeout(() => router.push(href), 1250);
  }

  return (
    <>
      <button
        onClick={launch}
        disabled={opening}
        className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-xl transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-90"
        style={{ background: `linear-gradient(135deg, ${NAVY_2}, ${NAVY})`, boxShadow: `0 12px 34px -12px ${NAVY}, 0 0 0 1px rgba(255,255,255,0.06) inset` }}
      >
        {/* moving sheen */}
        <span className="pointer-events-none absolute inset-0">
          <span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/15 blur-md animate-sheen" />
        </span>
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
          <DoorOpen className="h-5 w-5" style={{ color: SKY }} />
        </span>
        <span className="relative">Launch the portal</span>
        <ArrowRight className="relative h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {opening && <DoorReveal />}
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
      {/* Interior revealed behind the doors */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background animate-interior-in">
        <div className="mesh absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${SKY}55, transparent)` }} />
        <div className="relative flex flex-col items-center">
          <Image src="/logo.png" alt="Amal & Company" width={260} height={84} className="h-16 w-auto object-contain dark:hidden" priority />
          <Image src="/logo-white.png" alt="Amal & Company" width={260} height={84} className="hidden h-16 w-auto object-contain dark:block" priority />
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening the portal…
          </p>
        </div>
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

      {/* Brand seal that breaks apart as the doors open */}
      <div className="absolute inset-0 flex items-center justify-center animate-seal-out">
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-white/15 shadow-2xl" style={{ background: `linear-gradient(135deg, ${NAVY_2}, ${NAVY})` }}>
          <Image src="/logo-white.png" alt="Amal & Company" width={96} height={96} className="h-14 w-auto object-contain" priority />
        </div>
      </div>
    </div>
  );
}
