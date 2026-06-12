import { createBrowserClient } from "@supabase/ssr";

// Reads public env vars. When they're absent (e.g. before you've created a
// Supabase project), the app runs in DEMO MODE — auth is mocked locally so the
// deployment still works. Add the two vars in Vercel to flip on real auth.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase issues either the new publishable key (sb_publishable_...) or the
// legacy anon JWT — accept whichever variable is set.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(url!, anonKey!);
}
