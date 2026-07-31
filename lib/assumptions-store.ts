"use client";

// Persistence for the Assumption Registry.
// Uses the generic BaseStore — see lib/base-store.ts for the CRUD contract.

import { BaseStore } from "./base-store";
import type { Assumption, AssumptionStatus, RiskLevel } from "./types";

const r2a = (r: Record<string, unknown>): Assumption => ({
  id: r.id as string,
  email: r.email as string | undefined,
  statement: (r.statement as string) ?? "",
  owner: (r.owner as string) ?? "",
  status: (r.status as AssumptionStatus) ?? "Unverified",
  risk: (r.risk as RiskLevel) ?? "Low",
  linkedOutcome: (r.linked_outcome as string) ?? "",
  linkedEvidence: Array.isArray(r.linked_evidence) ? (r.linked_evidence as string[]) : [],
});

const a2r = (a: Assumption) => ({
  id: a.id, email: a.email ?? null, statement: a.statement, owner: a.owner,
  status: a.status, risk: a.risk, linked_outcome: a.linkedOutcome,
  linked_evidence: JSON.stringify(a.linkedEvidence ?? []),
});

class AssumptionStore extends BaseStore<Assumption> {
  table = "assumptions";
  lsKey = "toc-assumptions";
  scopeColumn = "email";
  fromRow = r2a;
  toRow = a2r;
}

const store = new AssumptionStore();

export const listAssumptions = (email?: string) => store.list(email);
export const createAssumption = (input: Omit<Assumption, "id">, email?: string) =>
  store.create({ ...input, email: email ?? input.email ?? undefined } as Omit<Assumption, "id">, email);
export const updateAssumption = store.update.bind(store);
export const deleteAssumption = (id: string) => store.delete({ id } as Assumption);
