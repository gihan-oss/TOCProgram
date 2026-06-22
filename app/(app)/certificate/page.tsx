"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button, EmptyHint } from "@/components/ui";
import { Confetti } from "@/components/confetti";
import { useAuth } from "@/components/auth";
import { loadModules, loadDone, moduleComplete } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import { MAS } from "@/lib/mas";

export default function CertificatePage() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [complete, setComplete] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (user.role !== "participant") { setComplete(true); setLoaded(true); setConfetti(true); return; }
      const mods = effectiveModules(await loadModules());
      const done = await loadDone(user.email);
      const withContent = mods.filter((m) => m.resources.length > 0);
      const done5 = withContent.length > 0 && withContent.every((m) => moduleComplete(m, done));
      setComplete(done5); setLoaded(true);
      if (done5) setConfetti(true);
    })();
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (!confetti) return;
    const t = setTimeout(() => setConfetti(false), 2200);
    return () => clearTimeout(t);
  }, [confetti]);

  const name = user?.name?.trim() || "Valued Learner";
  const issued = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  if (!loaded) return <div className="flex h-[50vh] items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  if (!complete) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyHint>Your certificate unlocks once you finish all 5 modules. You're almost there!</EmptyHint>
        <div className="mt-4 text-center">
          <Link href="/learning"><Button size="sm"><Icons.ArrowLeft className="h-4 w-4" /> Back to my learning</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {confetti && <Confetti />}

      {/* congrats header (not printed) */}
      <div className="mb-5 text-center print:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--success)/0.15)] px-3 py-1 text-xs font-semibold text-[hsl(var(--success))]">
          <Icons.PartyPopper className="h-3.5 w-3.5" /> All 5 modules complete
        </span>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Congratulations, {name.split(" ")[0]}! 🎉</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's your certificate — print it or take a screenshot to keep it.</p>
      </div>

      {/* THE CERTIFICATE (printable / screenshot-able) — fixed light styling */}
      <div className="overflow-hidden rounded-2xl p-1.5 shadow-xl print:shadow-none" style={{ background: "linear-gradient(135deg,#0e1a33,#1d2c4f)" }}>
        <div className="relative rounded-xl bg-white p-8 text-center sm:p-12" style={{ color: "#0e1a33" }}>
          {/* inner hairline frame */}
          <div className="pointer-events-none absolute inset-3 rounded-lg border" style={{ borderColor: "#8ec5e0" }} />

          <div className="relative">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Amal & Company" className="h-10 w-auto object-contain" />
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: "#6b7280" }}>Certificate of Completion</p>
            <div className="mx-auto mt-3 h-px w-16" style={{ background: "#caa54a" }} />

            <p className="mt-6 text-sm" style={{ color: "#4b5563" }}>This certifies that</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{name}</p>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "#374151" }}>
              has successfully completed the <b>{MAS.org} Theory of Change foundations</b> — all five learning modules — and is ready to begin building their organization's Theory of Change.
            </p>

            <p className="mx-auto mt-4 max-w-md text-sm italic" style={{ color: "#1d2c4f" }}>&ldquo;{MAS.northStar}&rdquo;</p>

            {/* seal */}
            <div className="mt-7 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md" style={{ background: "linear-gradient(135deg,#caa54a,#a9842f)" }}>
                <Icons.Award className="h-8 w-8" />
              </div>
            </div>

            <div className="mt-7 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold">{issued}</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>Date issued</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-sm font-semibold">Amal &amp; Company</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>{MAS.vision} · Scaling Social Impact</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* actions (not printed) */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 print:hidden">
        <Button onClick={() => window.print()}><Icons.Printer className="h-4 w-4" /> Print / Save as PDF</Button>
        <Link href="/toc"><Button variant="outline"><Icons.Workflow className="h-4 w-4" /> Start building your TOC</Button></Link>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground print:hidden">Tip: you can also take a screenshot to share it.</p>
    </div>
  );
}
