"use client";

// Persistence for the Evidence Repository.
// Uses the generic BaseStore — see lib/base-store.ts for the CRUD contract.

import { BaseStore } from "./base-store";
import type { Evidence, EvidenceKind } from "./types";

const r2e = (r: Record<string, unknown>): Evidence => ({
  id: r.id as string,
  email: r.email as string | undefined,
  name: (r.name as string) ?? "",
  kind: (r.kind as EvidenceKind) ?? "URL",
  tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
  linkedTo: (r.linked_to as string) ?? "",
  uploadedBy: (r.uploaded_by as string) ?? "",
  date: (r.date as string) ?? "",
});

const e2r = (e: Evidence) => ({
  id: e.id, email: e.email ?? null, name: e.name, kind: e.kind,
  tags: JSON.stringify(e.tags ?? []),
  linked_to: e.linkedTo, uploaded_by: e.uploadedBy, date: e.date,
});

class EvidenceStore extends BaseStore<Evidence> {
  table = "evidence";
  lsKey = "toc-evidence";
  scopeColumn = "email";
  fromRow = r2e;
  toRow = e2r;
}

const store = new EvidenceStore();

export const listEvidence = (email?: string) => store.list(email);
export const createEvidence = (input: Omit<Evidence, "id">, email?: string) =>
  store.create({ ...input, email: email ?? input.email ?? undefined } as Omit<Evidence, "id">, email);
export const deleteEvidence = (id: string) => store.delete({ id } as Evidence);
