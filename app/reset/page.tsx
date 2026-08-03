"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { useAuth } from "@/components/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { homeFor } from "@/lib/nav";
import { MAS } from "@/lib/mas";

// Landing page for the "forgot password" email link. Supabase brings the user
// here with a one-time recovery session already in the URL, which the auth
// client detects on load — so `user` becomes set. We then let them choose a new
// password (via updateUser under the hood) and continue into the portal.
export default function ResetPasswordPage() {
  const { user, loading, updatePassword, isDemo } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linkDead, setLinkDead] = useState(false);
  const [deadReason, setDeadReason] = useState<string | null>(null);

  // Establish the recovery session from whatever the email link carried. We
  // support all three shapes so it works no matter how the link was generated:
  //   • ?token_hash=…&type=recovery  → verifyOtp   (our branded email)
  //   • ?code=…                      → exchangeCodeForSession (Supabase PKCE)
  //   • #access_token=…              → detectSessionInUrl handles it (implicit)
  // Verifying in JS (not a plain GET) also means email link-scanners can't burn
  // a one-time token before the user arrives.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const tokenHash = q.get("token_hash");
    const type = q.get("type") || "recovery";
    const code = q.get("code");
    const urlErr = q.get("error_description") || q.get("error") || h.get("error_description") || h.get("error");
    const clearUrl = () => { try { window.history.replaceState({}, "", "/reset"); } catch {} };
    const fail = (reason: string) => { setDeadReason(reason); setLinkDead(true); setChecking(false); };

    const sb = getSupabaseBrowserClient();
    if (urlErr) { fail(urlErr); return; }
    if (!sb) return;

    (async () => {
      try {
        if (tokenHash) {
          const { error } = await sb.auth.verifyOtp({ type: type as "recovery", token_hash: tokenHash });
          clearUrl();
          if (error) fail(error.message);
        } else if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          clearUrl();
          if (error) fail(error.message);
        }
        // else: implicit #access_token — handled by the client, `user` will set.
      } catch (e) {
        fail(e instanceof Error ? e.message : "Couldn't verify the reset link");
      }
    })();
  }, []);

  // Give Supabase a moment to establish the recovery session from the URL
  // before we decide the link is invalid — otherwise we'd flash an error while
  // it's still being processed.
  useEffect(() => {
    if (user) { setChecking(false); return; }
    // Wait past the auth provider's role-resolution timeout (and failsafe)
    // before declaring the link dead — otherwise we'd flash "Link expired"
    // while the recovery session is still being established.
    const t = setTimeout(() => setChecking(false), 9000);
    return () => clearTimeout(t);
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw.length < 6) { setError("Your password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setError("Those passwords don't match."); return; }
    setBusy(true);
    const res = await updatePassword(newPw);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setDone(true);
  }

  if (isDemo) {
    return (
      <Frame>
        <h2 className="text-2xl font-bold tracking-tight">Password reset</h2>
        <p className="mt-2 text-sm text-muted-foreground">Password reset is available once the portal is connected to Supabase authentication.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">Back to sign in</Link>
      </Frame>
    );
  }

  if (!linkDead && (loading || (checking && !user))) {
    return (
      <Frame>
        <div className="flex items-center gap-3 text-muted-foreground"><Icons.Loader2 className="h-5 w-5 animate-spin" /> Verifying your reset link…</div>
      </Frame>
    );
  }

  if (!user) {
    return (
      <Frame>
        <h2 className="text-2xl font-bold tracking-tight">Link expired</h2>
        <p className="mt-2 text-sm text-muted-foreground">This password-reset link is invalid or has expired. Request a new one from the sign-in page.</p>
        {deadReason && <p className="mt-2 text-xs text-muted-foreground/70">Reason: {deadReason}</p>}
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
        <Button size="md" className="mt-6 w-full" onClick={() => router.replace(homeFor(user.role))}>
          Continue to portal <Icons.ArrowRight className="h-4 w-4" />
        </Button>
      </Frame>
    );
  }

  return (
    <Frame>
      <h2 className="text-2xl font-bold tracking-tight">Set a new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose a new password for <span className="font-medium text-foreground">{user.email}</span>.</p>
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

// Defined at module scope (NOT inside the component) so it keeps a stable
// component identity across renders — otherwise React would remount the whole
// subtree on every keystroke, and the password inputs would lose focus.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="fixed inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8"><Logo subtitle="Impact Portal" size="md" /></div>
        {children}
      </div>
    </div>
  );
}
