// Tracks whether a user has completed the guided welcome/onboarding so we only
// run it once. localStorage is the fast local cache; with Supabase configured
// the durable source of truth is profiles.onboarded (written by the welcome
// page via saveProfile), so onboarding follows the account across devices.
import { getProfile } from "./store";

const key = (email: string) => `toc-onboarded:${email.toLowerCase()}`;

export function hasOnboarded(email: string) {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(key(email)) === "1";
  } catch {
    return true;
  }
}

// The full check: local flag first (instant), then the saved profile
// (permanent, cross-device). Caches a positive answer locally.
export async function resolveOnboarded(email: string): Promise<boolean> {
  if (hasOnboarded(email)) return true;
  try {
    const p = await getProfile(email);
    if (p?.onboarded) {
      setOnboarded(email);
      return true;
    }
  } catch {}
  return false;
}

export function setOnboarded(email: string) {
  try {
    localStorage.setItem(key(email), "1");
  } catch {}
}

export function resetOnboarded(email: string) {
  try {
    localStorage.removeItem(key(email));
  } catch {}
}
