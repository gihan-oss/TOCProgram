"use client";

// Shared cohort-data loader — used by cohorts, dashboard, and reports pages.
// Queries members, profiles, course_progress, and course modules to derive
// participant lists and cohort groupings. No new schema required.

import { listMembers, listProfiles, listLearnerProgress } from "./store";
import { loadModules } from "./content";
import type { Member, ProgressRow } from "./store";
import type { MemberProfile } from "./store";

// ---- Result types -----------------------------------------------------------
export interface ParticipantRow {
  email: string;
  name: string;
  org: string;        // client name
  cohortId: string;   // client (or "unassigned")
  completion: number; // 0-100
  done: number;       // raw count of completed resources
  total: number;      // total resources across all modules
}

export interface CohortInfo {
  id: string;              // client name
  name: string;
  participantCount: number;  // total enrolled
  activeCount: number;       // participants with done > 0
  facilitator: string;
  avgCompletion: number;     // 0-100 (active participants only)
}

export interface CohortData {
  participants: ParticipantRow[];
  cohorts: CohortInfo[];
  totalResources: number;
  participantCount: number;
  activeParticipantCount: number;
}

// ---- Internals --------------------------------------------------------------
function buildRows(
  parts: Member[],
  profiles: MemberProfile[],
  progressRows: ProgressRow[],
  totalResources: number,
): ParticipantRow[] {
  const nameMap = new Map(profiles.map((p) => [p.email.toLowerCase(), p.name]));
  const doneMap = new Map(progressRows.map((r) => [r.email.toLowerCase(), r.done.length]));

  return parts.map((m) => {
    const email = m.email.toLowerCase();
    const done = doneMap.get(email) ?? 0;
    return {
      email,
      name: nameMap.get(email) || m.name || email.split("@")[0],
      org: m.client ?? "—",
      cohortId: m.client ?? "unassigned",
      done,
      total: totalResources,
      completion: totalResources > 0 ? Math.round((done / totalResources) * 100) : 0,
    };
  });
}

function buildCohorts(
  rows: ParticipantRow[],
  members: Member[],
): CohortInfo[] {
  const byClient = new Map<string, ParticipantRow[]>();
  for (const r of rows) {
    const key = r.cohortId;
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key)!.push(r);
  }

  const facilitatorByClient = new Map<string, string>();
  for (const m of members) {
    if ((m.role as string) === "facilitator" && m.client) {
      facilitatorByClient.set(m.client, m.name || m.email.split("@")[0]);
    }
  }

  return [...byClient.entries()].map(([client, cohortRows]) => {
    const active = cohortRows.filter((r) => r.done > 0);
    return {
      id: client,
      name: client === "unassigned" ? "Unassigned" : client,
      participantCount: cohortRows.length,
      activeCount: active.length,
      facilitator: facilitatorByClient.get(client) ?? "—",
      avgCompletion:
        active.length > 0
          ? Math.round(active.reduce((s, r) => s + r.completion, 0) / active.length)
          : 0,
    };
  });
}

// ---- Public -----------------------------------------------------------------
export async function loadCohortData(): Promise<CohortData> {
  const [members, profiles, progressRows, modules] = await Promise.all([
    listMembers(),
    listProfiles(),
    listLearnerProgress(),
    loadModules(),
  ]);
  const totalResources = modules.reduce((s, m) => s + m.resources.length, 0);

  const parts = members.filter((m: Member) => m.role === "participant");
  const rows = buildRows(parts, profiles, progressRows, totalResources);
  const cohortList = buildCohorts(rows, members);

  const activeCount = rows.filter((r) => r.done > 0).length;
  return {
    participants: rows,
    cohorts: cohortList,
    totalResources,
    participantCount: parts.length,
    activeParticipantCount: activeCount,
  };
}
