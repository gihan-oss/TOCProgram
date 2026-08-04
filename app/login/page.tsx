"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button, Photo, FloatingIcons } from "@/components/ui";
import { Logo } from "@/components/logo";
import { useAuth } from "@/components/auth";
import { IMAGES } from "@/lib/images";
import { resolveAccess } from "@/lib/access";
import { homeFor } from "@/lib/nav";
import { resolveOnboarded } from "@/lib/onboarding";
import { MAS } from "@/lib/mas";

// Where to land after sign-in: returning members go home; first-timers go to
// the guided welcome. Checks the saved profile too, so someone who onboarded
// on another device isn't asked twice.
async function destFor(email: string, role: ReturnType<typeof resolveAccess>["role"]) {
  return (await resolveOnboarded(email)) ? homeFor(role) : "/welcome";
}

export default function LoginPage() {
  const { user, loading, signIn, signInWithGoogle, signUp, isDemo, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Flips to true only after the user actively presses Sign in / Create account
  // on THIS page. We wait for the auth state to actually resolve (below) before
  // navigating — this is what makes sign-in reliably land in the portal instead
  // of spinning. Crucially it does NOT redirect someone who merely lands on
  // /login with an existing session, so we don't reintroduce the silent
  // auto-login.
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!entering || loading || !user) return;
    let active = true;
    destFor(user.email, user.role).then((dest) => { if (active) router.replace(dest); });
    return () => { active = false; };
  }, [entering, loading, user, router]);

  // Pre-fill email + password from the invite email's "Sign in" link
  // (…/login?email=…&pw=…), so invited users don't have to type them.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const e = q.get("email");
      const pw = q.get("pw");
      if (e) setEmail((v) => v || e);
      if (pw) setPassword((v) => v || pw);
      if ((e || pw) && window.history.replaceState) {
        // Drop the credentials from the address bar once captured.
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === "reset") {
      const res = await resetPassword(email);
      setBusy(false);
      if (res.error) setError(res.error);
      else setInfo("If that email has an account, a password-reset link is on its way. Check your inbox (and spam).");
      return;
    }
    const res = mode === "signin" ? await signIn(email, password) : await signUp(name, email, password);
    if (res.error) { setBusy(false); setError(res.error); return; }
    // Success — let the effect above redirect once the session actually resolves.
    setEntering(true);
    // Safety net: if the session doesn't come through shortly (e.g. the project
    // still requires email confirmation), stop the spinner so the user isn't stuck.
    setTimeout(() => {
      setBusy(false);
      setEntering(false);
      setInfo((cur) => cur ?? "You're signed in — if the portal doesn't open, refresh the page.");
    }, 6000);
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="fixed inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      {/* Left — imagery panel */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <Photo src="/photo-gathering.jpg" alt="MAS GLA community gathering" className="absolute inset-0 h-full w-full opacity-35" gradient="from-primary to-accent" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/50" />
        <FloatingIcons />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link href="/"><Logo invert size="md" /></Link>
          <div className="max-w-md animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              {MAS.org} · {MAS.vision}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight">The home for {MAS.org}&apos;s whole transformation.</h1>
            <p className="mt-4 text-primary-foreground/85">
              From our North Star to the six areas of focus, learning, implementation and impact — every part of the chapter&apos;s work, in one place. {MAS.northStar}
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              {[["Areas of focus", "6"], ["Modules", "4"], ["Roles", "5"]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="text-2xl font-bold">{v}</p>
                  <p className="text-xs text-primary-foreground/80">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-primary-foreground/70">An Amal &amp; Company platform · Scaling Social Impact</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="mesh absolute inset-0 opacity-60 lg:hidden" />
        <div className="relative w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo subtitle="Impact Portal" size="md" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight">{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? `Sign in to continue to the ${MAS.org} portal.` : mode === "signup" ? `Create your account to join the ${MAS.org} portal.` : "Enter your account email and we'll send you a link to set a new password."}
          </p>

          {isDemo && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs">
              <p className="flex items-start gap-2 text-foreground">
                <Icons.ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Access is restricted to people who&apos;ve been invited. Sign in with the email address your invitation was sent to.</span>
              </p>
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
            {mode !== "reset" && (
              <Field icon="Lock" label="Password">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="auth-input" />
              </Field>
            )}

            {mode === "signin" && (
              <div className="-mt-1 text-right">
                <button type="button" onClick={() => { setMode("reset"); setError(null); setInfo(null); }} className="text-xs font-medium text-accent hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="rounded-lg bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">{error}</p>}
            {info && <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">{info}</p>}

            <Button type="submit" size="md" className="w-full" disabled={busy}>
              {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              {!busy && <Icons.ArrowRight className="h-4 w-4" />}
            </Button>

            {mode === "signin" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or continue with</span></div>
                </div>
                <GoogleSignIn onSignIn={async (token) => {
                  setBusy(true);
                  setError(null);
                  const res = await signInWithGoogle(token);
                  if (res.error) { setBusy(false); setError(res.error); return; }
                  setEntering(true);
                  setTimeout(() => { setBusy(false); setEntering(false); setInfo("You're signed in — if the portal doesn't open, refresh the page."); }, 6000);
                }} />
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "reset" ? (
              <>Remembered it?{" "}
                <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className="font-semibold text-accent hover:underline">Back to sign in</button>
              </>
            ) : (
              <>{mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }} className="font-semibold text-accent hover:underline">
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </>
            )}
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

// ---- Google Sign-In button (uses the new Google Identity Services) ----------
function GoogleSignIn({ onSignIn }: { onSignIn: (token: string) => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load the GIS script once
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === "undefined" || !(window as unknown as { google?: { accounts?: { id?: { initialize?: unknown; prompt?: unknown } } } }).google?.accounts?.id) return;
    const google = (window as unknown as { google: { accounts: { id: { initialize: (cfg: Record<string, unknown>) => void; prompt: () => void; renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void } } } }).google;
    try {
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        callback: (response: { credential: string }) => onSignIn(response.credential),
        auto_select: false,
      });
    } catch {}
  }, [loaded, onSignIn]);

  if (!loaded) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const google = (window as unknown as { google?: { accounts?: { id?: { prompt?: () => void } } } }).google?.accounts?.id;
        if (google?.prompt) google.prompt();
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-accent/5"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continue with Google
    </button>
  );
}
