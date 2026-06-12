"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { Button, FloatingIcons } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Typewriter } from "@/components/typewriter";
import { useAuth } from "@/components/auth";
import { homeFor } from "@/lib/nav";
import { setOnboarded } from "@/lib/onboarding";
import type { Role } from "@/lib/types";

const ROLE_CONTENT: Record<Role, { noun: string; intro: string; tasks: { icon: string; text: string }[]; watch: string; cta: string }> = {
  participant: {
    noun: "Learner",
    intro: "You'll move from learning to real implementation — one guided step at a time.",
    tasks: [
      { icon: "PlayCircle", text: "Watch 4 short video modules with worksheets" },
      { icon: "Crosshair", text: "Write your Q-Zero statement for strategic clarity" },
      { icon: "Workflow", text: "Build your Theory of Change on an interactive canvas" },
      { icon: "PackageCheck", text: "Submit your implementation package for feedback" },
    ],
    watch: "Module 0: Q-Zero Protocol — your first lesson unlocks now.",
    cta: "Start my journey",
  },
  facilitator: {
    noun: "Facilitator",
    intro: "You'll guide cohorts from learning into implementation, and keep them accountable.",
    tasks: [
      { icon: "ClipboardCheck", text: "Review and approve learner submissions" },
      { icon: "MessageSquare", text: "Give feedback on Theories of Change & logframes" },
      { icon: "Activity", text: "Monitor cohort implementation progress" },
      { icon: "CalendarClock", text: "Schedule coaching sessions" },
    ],
    watch: "Your cohort dashboard shows who needs attention first.",
    cta: "Go to my dashboard",
  },
  coordinator: {
    noun: "Program Coordinator",
    intro: "You'll keep the program on track and make progress visible to everyone.",
    tasks: [
      { icon: "ListChecks", text: "Track participant completion" },
      { icon: "FolderOpen", text: "Monitor artifacts and submissions" },
      { icon: "Send", text: "Communicate with participants" },
      { icon: "Download", text: "Export reports for stakeholders" },
    ],
    watch: "Start with the cohort readiness overview.",
    cta: "Go to my dashboard",
  },
  admin: {
    noun: "Administrator",
    intro: "You control who's in, how cohorts run, and how impact is reported.",
    tasks: [
      { icon: "UserPlus", text: "Invite people and set admin or learner access" },
      { icon: "Users", text: "Create cohorts and assign facilitators" },
      { icon: "BookMarked", text: "Manage programs, modules and templates" },
      { icon: "FileBarChart", text: "View organization-wide reporting" },
    ],
    watch: "The Admin Console is your home base for everything.",
    cta: "Open the Admin Console",
  },
  executive: {
    noun: "Executive",
    intro: "You'll see whether the organization is converting learning into measurable impact.",
    tasks: [
      { icon: "TrendingUp", text: "Review portfolio impact dashboards" },
      { icon: "Rocket", text: "Monitor implementation rates" },
      { icon: "ShieldCheck", text: "Track portfolio health at a glance" },
    ],
    watch: "Begin with the portfolio overview.",
    cta: "View dashboards",
  },
};

const ORG = "Amal & Company";

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const firstName = user.name.split(" ")[0];
  const content = ROLE_CONTENT[user.role];

  function finish() {
    setOnboarded(user!.email);
    router.replace(homeFor(user!.role));
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-primary text-primary-foreground">
      <div className="mesh absolute inset-0 opacity-40" />
      <FloatingIcons />

      {/* progress dots */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo invert subtitle={null} size="md" />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-white" : i < step ? "w-4 bg-white/70" : "w-4 bg-white/30"}`} />
          ))}
        </div>
        <button onClick={finish} className="text-sm font-medium text-white/70 hover:text-white">Skip</button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        {/* STEP 0 — Welcome + flying animation */}
        {step === 0 && (
          <div className="max-w-xl text-center">
            <div className="animate-fade-up mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur" style={{ animationDelay: "100ms" }}>
              <Icons.PartyPopper className="h-10 w-10" />
            </div>
            <h1 className="animate-fade-up text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ animationDelay: "200ms" }}>
              Welcome to {ORG}
            </h1>
            <p className="animate-fade-up mt-4 text-lg text-primary-foreground/85" style={{ animationDelay: "400ms" }}>
              Hi {firstName} 👋 We're so glad you're here. Let's take a minute to show you what this is and what you'll do.
            </p>
            <div className="animate-fade-up mt-8" style={{ animationDelay: "650ms" }}>
              <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Let's begin <Icons.ArrowRight className="h-5 w-5" /></Button>
            </div>
          </div>
        )}

        {/* STEP 1 — Typewriter: why */}
        {step === 1 && (
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Why this matters</p>
            <div className="min-h-[180px] text-2xl font-semibold leading-relaxed sm:text-3xl">
              <Typewriter
                text={`Most nonprofit programs measure attendance and quiz scores. But funders, boards and the communities you serve care about one thing: did real change happen?\n\nThat's why ${ORG} built this — to help your organization prove implementation, not just participation, and turn good intentions into measurable impact.`}
                speed={22}
              />
            </div>
            <div className="mt-8 flex gap-3">
              <Button variant="ghost" size="md" className="text-white hover:bg-white/10" onClick={() => setStep(0)}><Icons.ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button variant="secondary" size="md" onClick={() => setStep(2)}>Continue <Icons.ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Role-specific onboarding */}
        {step === 2 && (
          <div className="w-full max-w-xl">
            <div className="animate-fade-up rounded-3xl bg-white p-7 text-foreground shadow-2xl sm:p-9">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                <Icons.BadgeCheck className="h-3.5 w-3.5" /> You're signed in as a {content.noun}
              </span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Here's what you'll do</h2>
              <p className="mt-1 text-sm text-muted-foreground">{content.intro}</p>

              <ul className="mt-5 space-y-2.5">
                {content.tasks.map((t, i) => {
                  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[t.icon] ?? Icons.Check;
                  return (
                    <li key={i} className="animate-fade-up flex items-center gap-3 rounded-xl border bg-card p-3" style={{ animationDelay: `${i * 90}ms` }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent"><Cmp className="h-4.5 w-4.5" /></span>
                      <span className="text-sm font-medium">{t.text}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
                <Icons.Eye className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm"><span className="font-semibold">First up: </span>{content.watch}</p>
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" size="md" onClick={() => setStep(1)}><Icons.ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button size="md" className="flex-1" onClick={finish}>{content.cta} <Icons.ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
