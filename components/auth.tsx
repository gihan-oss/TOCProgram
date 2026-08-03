"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolveAccess, type Access } from "@/lib/access";
import { checkMemberAccess } from "@/lib/store";
import type { Role } from "@/lib/types";

// Members-aware access: the static allowlist first, then anyone an admin has
// invited. Invited members are looked up through the check_access RPC (the
// members table itself is staff-only), so this works before sign-in without
// exposing the member list. This is what lets invited accounts sign in.
async function resolveWithMembers(email: string): Promise<Access> {
  const base = resolveAccess(email);
  if (base.allowed) return base;
  try {
    const m = await checkMemberAccess(email);
    if (m?.allowed) return { allowed: true, role: m.role };
  } catch {}
  return base;
}

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

const DEMO_KEY = "toc-demo-auth";
const nameFromEmail = (email: string) =>
  email.split("@")[0].split(/[.\-_]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");

// Supabase returns this when the email/password doesn't match an existing
// account — which, for an approved invitee signing in the first time, just
// means their account hasn't been created yet.
function isInvalidCredentials(error: { message?: string; code?: string }): boolean {
  return error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message ?? "");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  // Resolve the portal role, but never let a slow or unreachable members RPC
  // trap the user on the loading screen — fall back to the static-allowlist
  // role after a few seconds.
  const roleFor = async (email: string): Promise<Role> => {
    const fallback = resolveAccess(email).role;
    try {
      return await Promise.race([
        resolveWithMembers(email).then((a) => a.role),
        new Promise<Role>((resolve) => setTimeout(() => resolve(fallback), 6000)),
      ]);
    } catch {
      return fallback;
    }
  };

  const buildUser = async (email: string, name?: string): Promise<AuthUser> => ({
    email,
    name: name || nameFromEmail(email),
    role: await roleFor(email),
  });

  useEffect(() => {
    if (!supabase) {
      // demo mode — restore from localStorage
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {}
      setLoading(false);
      return;
    }

    let active = true;
    // Hard failsafe: whatever happens with Supabase, stop showing the loading
    // spinner so users are never stuck staring at it.
    const failsafe = setTimeout(() => { if (active) setLoading(false); }, 8000);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const u = data.session?.user;
        if (u?.email && active) setUser(await buildUser(u.email, u.user_metadata?.name as string));
      })
      .catch(() => {})
      .finally(() => { if (active) { setLoading(false); clearTimeout(failsafe); } });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      if (!u?.email) { if (active) setUser(null); return; }
      // IMPORTANT: don't await Supabase calls *inside* this callback — the auth
      // client holds an internal lock while it runs, so the members RPC in
      // buildUser would deadlock and hang the app on the loading screen. Defer
      // to the next tick, after the lock is released.
      const email = u.email;
      const name = u.user_metadata?.name as string;
      setTimeout(() => {
        if (!active) return;
        void buildUser(email, name).then((next) => { if (active) setUser(next); });
      }, 0);
    });

    return () => { active = false; clearTimeout(failsafe); sub.subscription.unsubscribe(); };
  }, [supabase]);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const access = await resolveWithMembers(email);
    if (!access.allowed) return { error: access.reason };
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return {};
      // First-time invited user: they're on the approved list but don't have a
      // login yet, so signing in fails with "invalid credentials". Create the
      // account for them on the spot (auto-approve) using the credentials they
      // just entered — so the emailed password works on the very first sign-in,
      // with no separate "Sign up" step.
      if (isInvalidCredentials(error)) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: nameFromEmail(email) } },
        });
        // A real, already-registered account → the password was simply wrong.
        if (signUpErr) return { error: "Incorrect password. Please use the password from your invitation email." };
        if (data.session) return {}; // auto-confirmed → signed in
        // Email confirmation is still on for the project: try once more, else guide.
        const retry = await supabase.auth.signInWithPassword({ email, password });
        return retry.error ? { error: "Account created — check your email to confirm it, then sign in." } : {};
      }
      return { error: error.message };
    }
    if (!email || password.length < 6) return { error: "Enter an email and a password of at least 6 characters." };
    const u: AuthUser = { email, name: nameFromEmail(email), role: access.role };
    localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    setUser(u);
    return {};
  };

  const signUp: AuthState["signUp"] = async (name, email, password) => {
    const access = await resolveWithMembers(email);
    if (!access.allowed) return { error: access.reason };
    if (supabase) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      return error ? { error: error.message } : {};
    }
    if (!email || password.length < 6) return { error: "Enter an email and a password of at least 6 characters." };
    const u: AuthUser = { email, name: name || nameFromEmail(email), role: access.role };
    localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    setUser(u);
    return {};
  };

  // Let a signed-in user replace their (temporary) password with their own.
  const updatePassword: AuthState["updatePassword"] = async (newPassword) => {
    if (!supabase) return {}; // demo mode — nothing to update
    if (!newPassword || newPassword.length < 6) return { error: "Your password must be at least 6 characters." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: error.message } : {};
  };

  // Send a "forgot password" email. The link brings the user back to /reset,
  // where they set a new password. Demo mode has no email service, so it's a
  // no-op success. We don't reveal whether the address has an account.
  const resetPassword: AuthState["resetPassword"] = async (email) => {
    if (!supabase) return {}; // demo mode — nothing to send
    if (!email) return { error: "Enter the email address for your account." };
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    return error ? { error: error.message } : {};
  };

  const signOut: AuthState["signOut"] = async () => {
    if (supabase) await supabase.auth.signOut();
    else localStorage.removeItem(DEMO_KEY);
    try { localStorage.removeItem("toc-role"); } catch {} // don't carry a role between accounts
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, isDemo: !isSupabaseConfigured, signIn, signUp, updatePassword, resetPassword, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
