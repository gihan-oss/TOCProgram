"use client";

// Thin fetch wrapper for client stores. A 503 means the API is reachable but
// the database is not configured (demo mode / no DATABASE_URL). Throwing a
// network-style error here makes every existing localStorage fallback path
// kick in, exactly as if the user were offline — so demo mode reads and writes
// behave like the old Supabase demo fallback, without touching 4xx/5xx server
// errors (those still return empty, per the read-fallback rule).
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 503) {
    throw new TypeError("Failed to fetch");
  }
  return res;
}
