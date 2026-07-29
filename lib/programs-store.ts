"use client";

// Program list persistence (shared & permanent, staff-writable).
// Uses Supabase directly (getSupabaseBrowserClient pattern from content.ts)
// with localStorage fallback for demo mode. The programs live in one JSON doc.

import { getSupabaseBrowserClient } from "./supabase";
import { PROGRAMS, type Program } from "./mas";

const PROGRAMS_KEY = "toc-programs";

export async function loadPrograms(): Promise<Program[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("programs")
        .select("data")
        .eq("id", "default")
        .maybeSingle();
      if (!error) {
        const list = data?.data as Program[] | undefined;
        if (list && list.length > 0) return list;
      }
      // Table missing, row empty, or error — fall through to localStorage.
    } catch {
      // Network error — fall through to localStorage.
    }
  }
  // localStorage (has any edits saved while offline), then SEED as last resort.
  if (typeof window === "undefined") return PROGRAMS;
  try {
    const raw = localStorage.getItem(PROGRAMS_KEY);
    const list = raw ? (JSON.parse(raw) as Program[]) : [];
    return list.length > 0 ? list : PROGRAMS;
  } catch {
    return PROGRAMS;
  }
}

export async function savePrograms(list: Program[]): Promise<boolean> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb
        .from("programs")
        .upsert(
          { id: "default", data: list, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
      if (!error) return true;
      // Supabase write failed — fall through to localStorage.
    } catch {
      // Network error — fall through to localStorage.
    }
  }
  // localStorage (always works, even when Supabase tables are missing).
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(PROGRAMS_KEY, JSON.stringify(list));
    }
    return true;
  } catch {
    return false;
  }
}
