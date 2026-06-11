"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { ASSUMPTIONS } from "@/lib/data";
import type { Assumption, AssumptionStatus, RiskLevel } from "@/lib/types";

const STATUSES: AssumptionStatus[] = ["Unverified", "Valid", "Under Review", "Failed"];
const statusTone: Record<AssumptionStatus, "muted" | "success" | "warning" | "danger"> = {
  Unverified: "muted",
  Valid: "success",
  "Under Review": "warning",
  Failed: "danger",
};
const riskTone: Record<RiskLevel, "success" | "warning" | "danger"> = { Low: "success", Medium: "warning", High: "danger" };

export default function AssumptionsPage() {
  const [items, setItems] = useState<Assumption[]>(ASSUMPTIONS);
  const [filter, setFilter] = useState<AssumptionStatus | "All">("All");

  const failed = items.filter((a) => a.status === "Failed");
  const shown = filter === "All" ? items : items.filter((a) => a.status === filter);

  function setStatus(id: string, status: AssumptionStatus) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <div>
      <SectionTitle sub="Every assumption is a managed object. Failed assumptions trigger alerts and a revision workflow.">
        Assumption Registry
      </SectionTitle>

      {failed.length > 0 && (
        <Card className="mb-4 border-l-4 border-l-[hsl(var(--danger))] p-4">
          <div className="flex items-start gap-3">
            <Icons.AlertOctagon className="mt-0.5 h-5 w-5 text-[hsl(var(--danger))]" />
            <div>
              <p className="font-medium text-[hsl(var(--danger))]">{failed.length} failed assumption{failed.length > 1 ? "s" : ""} require revision</p>
              {failed.map((a) => (
                <p key={a.id} className="mt-1 text-sm text-muted-foreground">
                  “{a.statement}” — linked to <span className="font-medium text-foreground">{a.linkedOutcome}</span>.
                  <button className="ml-1 font-medium text-accent hover:underline">Start revision workflow →</button>
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}
          >
            {s} {s !== "All" && <span className="opacity-70">({items.filter((a) => a.status === s).length})</span>}
          </button>
        ))}
        <button className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icons.Plus className="h-4 w-4" /> New assumption
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Assumption</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id} className="border-b align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.statement}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Linked outcome: {a.linkedOutcome}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{a.owner}</td>
                  <td className="px-4 py-3"><Badge tone={riskTone[a.risk]}>{a.risk}</Badge></td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value as AssumptionStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ring-1 ring-inset ring-border bg-[hsl(var(--${a.status === "Valid" ? "success" : a.status === "Under Review" ? "warning" : a.status === "Failed" ? "danger" : "muted"})/0.15)]`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {a.linkedEvidence.length ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent"><Icons.Paperclip className="h-3.5 w-3.5" /> {a.linkedEvidence.length} linked</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
