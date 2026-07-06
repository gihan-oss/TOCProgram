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
import { saveProfile, getProfile, addNotification, sendEmail } from "@/lib/store";
import { welcomeEmail } from "@/lib/email-templates";
import { MAS, PORTAL_URL, MEMBER_ROLE_TYPES, DEPARTMENTS, COMMITMENT_LEVELS, TENURE_OPTIONS } from "@/lib/mas";

const SKILLS = ["Teaching", "Event Planning", "Fundraising", "Media & Design", "Youth Mentorship", "Data & Reporting", "Operations", "Tech & Web"];

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // "Know Our Members" profile
  const [roleType, setRoleType] = useState("");
  const [department, setDepartment] = useState("");
  const [commitment, setCommitment] = useState("");
  const [tenure, setTenure] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Pre-fill from the saved profile so a returning user never re-types their
  // info — and can never accidentally overwrite it with blanks. They enter it
  // once; every later visit shows what they already saved.
  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile(user.email).then((p) => {
      if (!active || !p) return;
      setRoleType((v) => v || p.role_type || "");
      setDepartment((v) => v || p.department || "");
      setCommitment((v) => v || p.commitment || "");
      setTenure((v) => v || p.tenure || "");
      setSkills((v) => (v.length ? v : p.skills ?? []));
    });
    return () => { active = false; };
  }, [user?.email]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const firstName = user.name.split(" ")[0];
  const profileReady = roleType && department;

  async function finish() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await saveProfile({
        email: user.email,
        name: user.name,
        role_type: roleType,
        department,
        commitment,
        tenure,
        skills,
        onboarded: true,
      });
      setOnboarded(user.email);
      await addNotification(
        user.email,
        `Welcome to ${MAS.partner} 🎉`,
        department ? `You're set up in ${department}. Your next step is waiting on your home screen.` : "Your next step is waiting on your home screen.",
      );
      // fire-and-forget branded welcome email — sent once, whichever way they
      // joined (admin invite, email sign-up, or Google). Simulated until an
      // email key is set, so flows never break.
      const { subject, html } = welcomeEmail({ name: user.name, email: user.email, roleType, department, portalUrl: PORTAL_URL });
      sendEmail(user.email, subject, html);
    } finally {
      router.replace(homeFor(user.role));
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-white/0 via-white/70 to-white/0" />
      <div className="mesh absolute inset-0 opacity-40" />
      <FloatingIcons />

      {/* header / progress */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo invert size="md" />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-white" : i < step ? "w-4 bg-white/70" : "w-4 bg-white/30"}`} />
          ))}
        </div>
        <button onClick={finish} className="text-sm font-medium text-white/70 hover:text-white" disabled={busy}>Skip</button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-14">
        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <div className="max-w-xl text-center">
            <div className="animate-fade-up mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur" style={{ animationDelay: "100ms" }}>
              <Icons.PartyPopper className="h-10 w-10" />
            </div>
            <h1 className="animate-fade-up text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ animationDelay: "200ms" }}>
              Welcome, {firstName}
            </h1>
            <p className="animate-fade-up mt-4 text-lg text-primary-foreground/85" style={{ animationDelay: "400ms" }}>
              You're joining the home for our whole transformation — learning, programs, measurement and impact, all working toward one North Star. This takes two minutes.
            </p>
            <div className="animate-fade-up mt-8" style={{ animationDelay: "600ms" }}>
              <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Let's begin <Icons.ArrowRight className="h-5 w-5" /></Button>
            </div>
          </div>
        )}

        {/* STEP 1 — Why (strategic, typewriter) */}
        {step === 1 && (
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Our North Star</p>
            <div className="min-h-[150px] text-2xl font-semibold leading-relaxed sm:text-3xl">
              <Typewriter
                text={`"${MAS.northStar}"\n\nThis is more than a Theory of Change tool — it's where our whole transformation lives: learning, programs, measurement and impact, across all six areas of focus.\n\nEvery program still answers Question Zero — who are we moving, and what change are we creating? That's how activity becomes impact.`}
                speed={18}
              />
            </div>
            <div className="mt-8 flex gap-3">
              <Button variant="ghost" size="md" className="text-white hover:bg-white/10" onClick={() => setStep(0)}><Icons.ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button variant="secondary" size="md" onClick={() => setStep(2)}>Continue <Icons.ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Know Our Members profile */}
        {step === 2 && (
          <div className="w-full max-w-xl">
            <div className="animate-fade-up rounded-3xl bg-white p-7 text-foreground shadow-2xl sm:p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                <Icons.UserCheck className="h-3.5 w-3.5" /> Know Our Members
              </span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Tell us where you serve</h2>
              <p className="mt-1 text-sm text-muted-foreground">This connects you to the right programs and team — saved to your profile, editable anytime.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">I serve as a…</span>
                  <select value={roleType} onChange={(e) => setRoleType(e.target.value)} className="modal-input">
                    <option value="">Select…</option>
                    {MEMBER_ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Department / Area of Focus</span>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="modal-input">
                    <option value="">Select…</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Weekly commitment</span>
                  <select value={commitment} onChange={(e) => setCommitment(e.target.value)} className="modal-input">
                    <option value="">Select…</option>
                    {COMMITMENT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Time with the organization</span>
                  <select value={tenure} onChange={(e) => setTenure(e.target.value)} className="modal-input">
                    <option value="">Select…</option>
                    {TENURE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <p className="mt-4 mb-1.5 text-xs font-medium text-muted-foreground">Skills you bring (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${skills.includes(s) ? "bg-accent text-accent-foreground" : "border bg-card hover:bg-secondary"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" size="md" onClick={() => setStep(1)}><Icons.ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button size="md" className="flex-1" disabled={!profileReady || busy} onClick={finish}>
                  {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <>{profileReady ? "Finish & enter the portal" : "Choose your role & department"} <Icons.ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
