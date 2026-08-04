"use client";

// Client directory. With the database configured it's shared & permanent (a single
// JSON document every admin sees); otherwise it falls back to localStorage so
// the app still works in demo mode. MAS GLA is seeded as the first client.

import { apiFetch } from "./api-fetch";

export type ClientStatus = "Active" | "Onboarding" | "Paused" | "Archived";

export interface Client {
  id: string;
  name: string;
  category: string;
  region: string;
  status: ClientStatus;
  contact?: string;
  notes?: string;
  logoUrl?: string; // client's own logo, shown beside the Amal & Company lockup
}

// The client whose logo co-brands the portal: the first Active client, else the
// first client of any status. Used by the header/login co-brand lockup.
export function primaryClient(list: Client[]): Client | undefined {
  return list.find((c) => c.status === "Active") ?? list[0];
}

export const CLIENT_CATEGORIES = ["Faith-based", "Nonprofit", "Education", "Government", "Healthcare", "Community", "Other"];
export const CLIENT_REGIONS = ["GLA", "IE", "OC", "LA", "Valley", "National", "Other"];
export const CLIENT_STATUSES: ClientStatus[] = ["Active", "Onboarding", "Paused", "Archived"];

export const STATUS_TONE: Record<ClientStatus, "success" | "accent" | "warning" | "muted"> = {
  Active: "success",
  Onboarding: "accent",
  Paused: "warning",
  Archived: "muted",
};

// The first client — Muslim American Society, Greater Los Angeles.
export const SEED_CLIENTS: Client[] = [
  { id: "mas-gla", name: "MAS GLA", category: "Faith-based", region: "GLA", status: "Active", notes: "Muslim American Society — Greater Los Angeles. First client; runs the Theory of Change program." },
];

const KEY = "toc-clients";

export async function loadClients(): Promise<Client[]> {
  try {
    const res = await apiFetch("/api/clients");
    if (res.ok) {
      const data = await res.json();
      const list = data?.data as Client[] | undefined;
      return list ?? SEED_CLIENTS;
    }
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  if (typeof window === "undefined") return SEED_CLIENTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Client[]) : SEED_CLIENTS;
  } catch {
    return SEED_CLIENTS;
  }
}

export async function saveClients(list: Client[]): Promise<boolean> {
  try {
    const res = await apiFetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: list, updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch {}
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
