"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { homeFor } from "@/lib/nav";
import { MAS } from "@/lib/mas";
import type { Role } from "@/lib/types";

// Landing page for the "forgot password" email link. The link carries a
// short-lived signed token (?token=...) that lets the user choose a new
// password without being signed in.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [legacySupabase, setLegacySupabase] = useState(false);
  const [checking, setChecking] = useState(true);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      setToken(new URLSearchParams(window.location.search).get("token"));
      // Detect legacy Supabase recovery links (hash carries access_token +
      // type=recovery). The Supabase client used to extract these, but we no
      // longer include it — guide the user to request a fresh reset link.
      if (window.location.hash.includes("type=recovery")) {
        setLegacySupabase(true);
      }
    } catch {}
    setChecking(false);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) { setError("This reset link is invalid or has expired. Request a new one."); return; }
    if (newPw.length < 6) { setError("Your password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setError("Those passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setBusy(false); setError(data.error ?? "Password update failed."); return; }
      // The server signs the user in — resolve the session to land on the
      // right page.
      let role: Role = "participant";
      try {
        const s = await fetch("/api/auth/session");
        if (s.ok) { const sess = await s.json(); role = (sess?.user?.role as Role) ?? "participant"; }
      } catch {}
      setBusy(false);
      setDone(true);
      setTimeout(() => router.replace(homeFor(role)), 800);
    } catch {
      setBusy(false);
      setError("Couldn't reach the portal. Check your connection and try again.");
    }
  }

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="fixed inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8"><Logo subtitle="Impact Portal" size="md" /></div>
        {children}
      </div>
    </div>
  );

  if (checking) {
    return (
      <Frame>
        <div className="flex items-center gap-3 text-muted-foreground"><Icons.Loader2 className="h-5 w-5 animate-spin" /> Verifying your reset link…</div>
      </Frame>
    );
  }

  if (!token) {
    return (
      <Frame>
        <h2 className="text-2xl font-bold tracking-tight">Link expired</h2>
        {legacySupabase ? (
          <p className="mt-2 text-sm text-muted-foreground">You&apos;re using a password-reset link from before our recent upgrade. Those links no longer work — please request a new one from the sign-in page and it will arrive straight away.</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">This password-reset link is invalid or has expired. Request a new one from the sign-in page.</p>
        )}
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">Back to sign in</Link>
      </Frame>
    );
  }

  if (done) {
    return (
      <Frame>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"><Icons.CheckCircle2 className="h-6 w-6" /></div>
        <h2 className="text-2xl font-bold tracking-tight">Password updated</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your new password is set. You can continue into the {MAS.org} portal.</p>
        <Button size="md" className="mt-6 w-full" onClick={() => router.replace(homeFor("participant"))}>
          Continue to portal <Icons.ArrowRight className="h-4 w-4" />
        </Button>
      </Frame>
    );
  }

  return (
    <Frame>
      <h2 className="text-2xl font-bold tracking-tight">Set a new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">New password</span>
          <input type="password" required autoComplete="new-password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setError(null); }} placeholder="••••••••" className="auth-input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Confirm new password</span>
          <input type="password" required autoComplete="new-password" value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setError(null); }} placeholder="••••••••" className="auth-input" />
        </label>
        {error && <p className="rounded-lg bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">{error}</p>}
        <Button type="submit" size="md" className="w-full" disabled={busy || newPw.length < 6 || newPw !== confirmPw}>
          {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <>Update password <Icons.ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>
    </Frame>
  );
}
