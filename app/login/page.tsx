"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button, Photo, FloatingIcons } from "@/components/ui";
import { Logo } from "@/components/logo";
import { useAuth } from "@/components/auth";
import { IMAGES } from "@/lib/images";
import { DEMO_ACCOUNTS, resolveAccess } from "@/lib/access";
import { homeFor } from "@/lib/nav";
import { hasOnboarded } from "@/lib/onboarding";

function destFor(email: string, role: ReturnType<typeof resolveAccess>["role"]) {
  return hasOnboarded(email) ? homeFor(role) : "/welcome";
}

export default function LoginPage() {
  const { user, loading, signIn, signUp, isDemo } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(destFor(user.email, user.role));
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === "signin" ? await signIn(email, password) : await signUp(name, email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.replace(destFor(email, resolveAccess(email).role));
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — imagery panel */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <Photo src="/photo-gathering.jpg" alt="MAS GLA community gathering" className="absolute inset-0 h-full w-full opacity-35" gradient="from-primary to-accent" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/50" />
        <FloatingIcons />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link href="/"><Logo invert subtitle="Impact Portal" size="md" /></Link>
          <div className="max-w-md animate-fade-up">
            <h1 className="text-4xl font-extrabold leading-tight">Turn learning into measurable impact.</h1>
            <p className="mt-4 text-primary-foreground/85">
              The strategic operating system for nonprofits, foundations, ministries and social enterprises — built around implementation evidence, not attendance.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              {[["Modules", "4"], ["Dashboards", "6"], ["Roles", "5"]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="text-2xl font-bold">{v}</p>
                  <p className="text-xs text-primary-foreground/80">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-primary-foreground/70">“What change are we creating, and how do we know it’s happening?”</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="mesh absolute inset-0 opacity-60 lg:hidden" />
        <div className="relative w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo subtitle="Impact Portal" size="md" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue to your portal." : "Start building your theory of change."}
          </p>

          {isDemo && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs">
              <p className="flex items-start gap-2 text-foreground">
                <Icons.ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Access is restricted to approved accounts. Try one of these (any 6+ char password):</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => { setEmail(a.email); setPassword("demo1234"); setMode("signin"); }}
                    className="rounded-lg border bg-card px-2.5 py-1 font-medium hover:bg-secondary"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field icon="User" label="Full name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hannah Maki" className="auth-input" />
              </Field>
            )}
            <Field icon="Mail" label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.org" className="auth-input" />
            </Field>
            <Field icon="Lock" label="Password">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="auth-input" />
            </Field>

            {error && <p className="rounded-lg bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">{error}</p>}

            <Button type="submit" size="md" className="w-full" disabled={busy}>
              {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
              {!busy && <Icons.ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to Impact OS?" : "Already have an account?"}{" "}
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }} className="font-semibold text-accent hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ?? Icons.Circle;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <Cmp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </span>
    </label>
  );
}
