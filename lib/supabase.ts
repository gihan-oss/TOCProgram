import { createBrowserClient } from "@supabase/ssr";

// Connection to Supabase. The project URL and the anon/publishable key below are
// PUBLIC values — the anon key is designed to be shipped in the browser, and all
// data access is guarded by row-level security (see supabase/schema.sql). Baking
// them in means the deployed app always connects, with no environment-variable
// setup required. Environment variables, when present, still win — so the
// project can be re-pointed (e.g. to a staging database) without a code change.
const DEFAULT_SUPABASE_URL = "https://evwzlgzticnblpdqphus.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2d3psZ3p0aWNuYmxwZHFwaHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDI4NTIsImV4cCI6MjA5NjgxODg1Mn0.Y6buCc5Z3R0xr-GbbABUEyMBgYbw5AU1LbKgd4gLHyc";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
// Supabase issues either the new publishable key (sb_publishable_...) or the
// legacy anon JWT — accept whichever variable is set, else the default above.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Cache a single browser client for the whole tab. Creating a fresh GoTrue
// client on every call means multiple auth instances all contend on the same
// browser auth-lock (navigator.locks), which can stall session reads and leave
// the app stuck on the loading screen. One shared instance avoids that.
const makeBrowserClient = () => createBrowserClient(url!, anonKey!);
let browserClient: ReturnType<typeof makeBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  // On the server there's no shared tab to cache for; make a throwaway client.
  if (typeof window === "undefined") return makeBrowserClient();
  if (!browserClient) browserClient = makeBrowserClient();
  return browserClient;
}
