"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { listAssumptions, createAssumption, updateAssumption, deleteAssumption } from "@/lib/assumptions-store";
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
  const [items, setItems] = useState<Assumption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<AssumptionStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    listAssumptions(user?.email).then((data) => { setItems(data); setLoaded(true); });
  }, [user?.email]);

  const failed = items.filter((a) => a.status === "Failed");
  const shown = items.filter((a) =>
    (filter === "All" || a.status === filter) &&
    (!search || a.statement.toLowerCase().includes(search.toLowerCase()) || a.owner.toLowerCase().includes(search.toLowerCase())),
  );

  async function setStatus(id: string, status: AssumptionStatus) {
    const a = items.find((x) => x.id === id);
    if (!a) return;
    setSaving((s) => new Set(s).add(id));
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    await updateAssumption(a, { status });
    setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  async function addAssumption() {
    const a = await createAssumption({
      statement: "New assumption — describe what must hold true\u2026",
      owner: "Unassigned", status: "Unverified", risk: "Medium",
      linkedOutcome: "\u2014", linkedEvidence: [],
    }, user?.email);
    setItems((prev) => [a, ...prev]);
    setFilter("All");
    toast("Assumption added");
  }

  async function removeAssumption(id: string) {
    if (!window.confirm("Delete this assumption?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    await deleteAssumption(id);
    toast("Assumption removed");
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
                  &ldquo;{a.statement}&rdquo; &mdash; linked to <span className="font-medium text-foreground">{a.linkedOutcome}</span>.
                  <button className="ml-1 font-medium text-accent hover:underline">Start revision workflow &rarr;</button>
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border bg-card py-1.5 pl-9 pr-3 text-sm outline-none focus:border-accent"
            placeholder="Search assumptions\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}
          >
            {s} {s !== "All" && <span className="opacity-70">({items.filter((a) => a.status === s).length})</span>}
          </button>
        ))}
        <button onClick={addAssumption} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icons.Plus className="h-4 w-4" /> New assumption
        </button>
      </div>

      <Card className="overflow-hidden">
        {!loaded ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No assumptions yet. Add one to track the conditions your programs depend on." : "No assumptions match this filter."}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Assumption</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id} className="border-b align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.statement}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Linked outcome: {a.linkedOutcome}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{a.owner}</td>
                  <td className="px-4 py-3"><Badge tone={riskTone[a.risk]}>{a.risk}</Badge></td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value as AssumptionStatus)}
                      disabled={saving.has(a.id)}
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
                  <td className="px-4 py-3">
                    <button onClick={() => removeAssumption(a.id)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-[hsl(var(--danger))]" title="Delete">
                      <Icons.Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>
    </div>
  );
}
