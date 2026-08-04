"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { resolveAccess, type Access } from "@/lib/access";
import { checkMemberAccess } from "@/lib/store";
import type { Role } from "@/lib/types";

// Members-aware access: the static allowlist first, then anyone an admin has
// invited. Invited members are looked up through the check_access endpoint (the
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
  signInWithGoogle: (googleToken: string) => Promise<{ error?: string }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const buildUser = async (email: string, name?: string): Promise<AuthUser> => ({
    email,
    name: name || nameFromEmail(email),
    role: (await resolveWithMembers(email)).role,
  });

  // Check for an existing session on mount.
  useEffect(() => {
    (async () => {
      let serverReached = false;
      try {
        const res = await apiFetch("/api/auth/session");
        serverReached = true;
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(await buildUser(data.user.email, data.user.name));
            setIsDemo(false);
            setLoading(false);
            return;
          }
        }
      } catch {}
      // Demo mode only when the API was unreachable (offline / no DB). A
      // reachable API that reports "no session" is NOT demo mode.
      if (!serverReached) {
        try {
          const raw = localStorage.getItem(DEMO_KEY);
          if (raw) {
            setUser(JSON.parse(raw));
            setIsDemo(true);
          }
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const access = await resolveWithMembers(email);
    if (!access.allowed) return { error: access.reason };
    if (!email || password.length < 6) return { error: "Enter an email and a password of at least 6 characters." };
    try {
      const res = await apiFetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Sign-in failed." };
      const u = await buildUser(data.user.email, data.user.name);
      setUser(u);
      setIsDemo(false);
      return {};
    } catch {
      // API unavailable → demo mode fallback
      const u: AuthUser = { email, name: nameFromEmail(email), role: access.role };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      setIsDemo(true);
      return {};
    }
  };

  const signInWithGoogle: AuthState["signInWithGoogle"] = async (googleToken) => {
    try {
      const res = await apiFetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleToken }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Google sign-in failed." };
      // Check access after Google auth
      const access = await resolveWithMembers(data.user.email);
      if (!access.allowed) return { error: access.reason };
      const u = await buildUser(data.user.email, data.user.name);
      setUser(u);
      setIsDemo(false);
      return {};
    } catch {
      return { error: "Sign-in unavailable. Check your connection." };
    }
  };

  const signUp: AuthState["signUp"] = async (name, email, password) => {
    const access = await resolveWithMembers(email);
    if (!access.allowed) return { error: access.reason };
    if (!email || password.length < 6) return { error: "Enter an email and a password of at least 6 characters." };
    try {
      const res = await apiFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Sign-up failed." };
      return {};
    } catch {
      // API unavailable → demo mode
      const u: AuthUser = { email, name: name || nameFromEmail(email), role: access.role };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      setIsDemo(true);
      return {};
    }
  };

  const updatePassword: AuthState["updatePassword"] = async (newPassword) => {
    if (!newPassword || newPassword.length < 6) return { error: "Your password must be at least 6 characters." };
    try {
      const res = await apiFetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Password update failed." };
      return {};
    } catch {
      return {}; // demo mode — nothing to update
    }
  };

  const resetPassword: AuthState["resetPassword"] = async (email) => {
    if (!email) return { error: "Enter the email address for your account." };
    try {
      const res = await apiFetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error };
      return {};
    } catch {
      return {}; // demo mode — no email service
    }
  };

  const signOut: AuthState["signOut"] = async () => {
    try {
      await apiFetch("/api/auth/signout", { method: "POST" });
    } catch {}
    localStorage.removeItem(DEMO_KEY);
    try { localStorage.removeItem("toc-role"); } catch {}
    setUser(null);
    setIsDemo(false);
  };

  return (
    <Ctx.Provider value={{ user, loading, isDemo, signIn, signInWithGoogle, signUp, updatePassword, resetPassword, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
