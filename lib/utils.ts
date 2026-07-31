import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/** Distinguish errors that should still cache to localStorage from ones
 *  that shouldn't. Only skip caching for actual data-integrity violations
 *  (PostgreSQL class 22 = data exception, 23 = integrity constraint).
 *  Missing tables, RLS, and network errors → cache locally. */
export function isNetworkError(e: unknown): boolean {
  if (!e || typeof e !== "object") return true;
  const code = (e as Record<string, unknown>).code;
  if (typeof code !== "string") return true;           // no code → network
  // PostgreSQL class 22 (data_exception) and 23 (integrity_constraint_violation)
  if (code.startsWith("22") || code.startsWith("23")) return false; // integrity
  return true; // RLS, missing table, etc. → cache
}

// Trigger a client-side download of text content as a named file.
export function downloadFile(filename: string, content: string, mime = "text/plain") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
