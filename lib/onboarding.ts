// Tracks whether a user has completed the guided welcome/onboarding so we only
// run it once. (Demo: stored in localStorage; with Supabase this would live on
// the user profile.)
const key = (email: string) => `toc-onboarded:${email.toLowerCase()}`;

export function hasOnboarded(email: string) {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(key(email)) === "1";
  } catch {
    return true;
  }
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
