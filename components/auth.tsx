"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolveAccess, type Access } from "@/lib/access";
import { listMembers } from "@/lib/store";
import type { Role } from "@/lib/types";

// Members-aware access: the static allowlist first, then anyone an admin has
// invited (the members table). This is what lets invited accounts sign in.
async function resolveWithMembers(email: string): Promise<Access> {
  const base = resolveAccess(email);
  if (base.allowed) return base;
  try {
    const e = email.trim().toLowerCase();
    const m = (await listMembers()).find((x) => x.email.trim().toLowerCase() === e);
    if (m) return { allowed: true, role: m.role === "admin" ? "admin" : "participant" };
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
  const supabase = getSupabaseBrowserClient();

  const buildUser = async (email: string, name?: string): Promise<AuthUser> => ({
    email,
    name: name || nameFromEmail(email),
    role: (await resolveWithMembers(email)).role,
  });

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(async ({ data }) => {
        const u = data.session?.user;
        if (u) setUser(await buildUser(u.email ?? "", u.user_metadata?.name as string));
        setLoading(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
        const u = session?.user;
        setUser(u ? await buildUser(u.email ?? "", u.user_metadata?.name as string) : null);
      });
      return () => sub.subscription.unsubscribe();
    }
    // demo mode — restore from localStorage
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, [supabase]);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const access = await resolveWithMembers(email);
    if (!access.allowed) return { error: access.reason };
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
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

  const signOut: AuthState["signOut"] = async () => {
    if (supabase) await supabase.auth.signOut();
    else localStorage.removeItem(DEMO_KEY);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, isDemo: !isSupabaseConfigured, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
