"use client";

// Thin fetch wrapper for client stores. Any 5xx (server error — DB down,
// connection-pool exhaustion, crash) is converted to a network-style throw so
// the BaseStore localStorage fallback kicks in and callers show last-known-good
// cached data instead of empty. 4xx errors pass through normally (validation
// failures, not-found, forbidden) — callers return empty without touching cache,
// which is correct (stale data for a deleted entity would be wrong).
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status >= 500) {
    throw new TypeError("Failed to fetch");
  }
  return res;
}
