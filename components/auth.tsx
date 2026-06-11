"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

export interface AuthUser {
  email: string;
  name: string;
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

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        if (u) setUser({ email: u.email ?? "", name: (u.user_metadata?.name as string) ?? nameFromEmail(u.email ?? "") });
        setLoading(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        const u = session?.user;
        setUser(u ? { email: u.email ?? "", name: (u.user_metadata?.name as string) ?? nameFromEmail(u.email ?? "") } : null);
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
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    }
    if (!email || password.length < 6) return { error: "Enter an email and a password of at least 6 characters." };
    const u = { email, name: nameFromEmail(email) };
    localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    setUser(u);
    return {};
  };

  const signUp: AuthState["signUp"] = async (name, email, password) => {
    if (supabase) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      return error ? { error: error.message } : {};
    }
    if (!email || password.length < 6) return { error: "Enter an email and a password of at least 6 characters." };
    const u = { email, name: name || nameFromEmail(email) };
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
