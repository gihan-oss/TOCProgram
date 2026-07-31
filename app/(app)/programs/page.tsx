"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Stat, Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useApp } from "@/components/providers";
import {
  QUESTION_ZERO, AREAS_OF_FOCUS, DESIRED_OUTCOMES, PEOPLE,
  DECISION_STATUS, PROGRAM_STATUS,
  type Program, type Decision, type ProgramStatus,
} from "@/lib/mas";
import { loadPrograms, createProgram, saveProgram, deleteProgram } from "@/lib/programs-store";

const decisionTone: Record<Decision, "success" | "warning" | "danger"> = { Keep: "success", Modify: "warning", Cancel: "danger" };
const statusTone: Record<ProgramStatus, "success" | "accent" | "warning" | "muted"> = {
  "On Track": "success", Completed: "accent", "At Risk": "warning", "Not Started": "muted",
};
const personName = (id: string) => PEOPLE.find((p) => p.id === id)?.name ?? id;
const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2);

const blank = (): Omit<Program, "id"> => ({
  name: "", area: AREAS_OF_FOCUS[0].name, input: "", baseline: "",
  outcome: DESIRED_OUTCOMES[0], decision: "Keep", status: "Not Started", budget: 0, team: [],
});

export default function ProgramsPage() {
  const { role } = useApp();
  const isAdmin = role === "admin";
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState<string | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | "All">("All");
  const [decisionFilter, setDecisionFilter] = useState<Decision | "All">("All");
  const [editing, setEditing] = useState<Program | null>(null);
  const [isNew, setIsNew] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadPrograms().then((ps) => {
      setPrograms(ps);
      setLoaded(true);
    });
  }, []);

  const summary = useMemo(() => ({
    total: programs.length,
    onTrack: programs.filter((p) => p.status === "On Track").length,
    completed: programs.filter((p) => p.status === "Completed").length,
    budget: programs.reduce((s, p) => s + p.budget, 0),
  }), [programs]);

  const decisionTotals = useMemo(() => ({
    Keep: programs.filter((p) => p.decision === "Keep").length,
    Modify: programs.filter((p) => p.decision === "Modify").length,
    Cancel: programs.filter((p) => p.decision === "Cancel").length,
  }), [programs]);

  const activeAreas = useMemo(() => {
    const names = new Set(programs.map((p) => p.area));
    return AREAS_OF_FOCUS.map((a) => a.name).filter((n) => names.has(n));
  }, [programs]);

  const shown = programs.filter((p) =>
    (areaFilter === "All" || p.area === areaFilter) &&
    (statusFilter === "All" || p.status === statusFilter) &&
    (decisionFilter === "All" || p.decision === decisionFilter) &&
    (!q || `${p.name} ${p.area} ${p.outcome} ${p.department ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  const saveTimer = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function patch(id: string, fields: Partial<Program>) {
    setPrograms((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...fields } : p));
      const existing = saveTimer.current.get(id);
      if (existing) clearTimeout(existing);
      saveTimer.current.set(id, setTimeout(() => {
        const updated = next.find((p) => p.id === id);
        if (updated) saveProgram(updated);
      }, 600));
      return next;
    });
  }
  async function save(p: Program) {
    if (!p.name.trim()) { toast("Give the program a name", "error"); return; }
    if (isNew) {
      const { id: _, ...input } = p;
      const created = await createProgram(input);
      setPrograms((prev) => [created, ...prev]);
      toast("Program added");
    } else {
      await saveProgram(p);
      setPrograms((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      toast("Program updated");
    }
    setEditing(null);
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this program? This cannot be undone.")) return;
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    await deleteProgram(id);
    setEditing(null);
    toast("Program deleted");
  }

  const groups = areaFilter === "All" ? activeAreas : [areaFilter];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Programs — Theory of Change Dashboard</h1>
          <p className="text-sm text-muted-foreground">Every program answers Question Zero, targets an audience (Input), drives a Change, and carries a Keep / Modify / Cancel decision.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setEditing(blank() as Program); setIsNew(true); }}>
            <Icons.Plus className="h-4 w-4" /> Add Program
          </Button>
        )}
      </div>

      {/* Live summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Programs" value={summary.total} hint="In this workspace" />
        <Stat label="On Track" value={summary.onTrack} tone="success" />
        <Stat label="Completed" value={summary.completed} tone="success" />
        <Stat label="Total Budget" value={`$${summary.budget.toLocaleString()}`} />
      </div>

      {/* Question Zero */}
      <Card className="mt-6 p-5">
        <p className="mb-3 text-sm font-semibold">Question Zero — every program must answer:</p>
        <div className="flex flex-wrap items-center gap-2">
          {QUESTION_ZERO.map((q, i) => (
            <div key={q.step} className="flex items-center gap-2">
              <div className="rounded-xl border bg-secondary/60 px-3 py-2">
                <p className="text-sm font-bold">{q.step}</p>
                <p className="max-w-[180px] text-[11px] text-muted-foreground">{q.desc}</p>
              </div>
              {i < QUESTION_ZERO.length - 1 && <Icons.ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Decision totals (clickable filters) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(["Keep", "Modify", "Cancel"] as Decision[]).map((d) => (
          <button key={d} onClick={() => setDecisionFilter(decisionFilter === d ? "All" : d)} className="text-left">
            <Card className={`flex items-center gap-3 p-4 transition-shadow hover:shadow-md ${decisionFilter === d ? "ring-2 ring-accent" : ""}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--${d === "Keep" ? "success" : d === "Modify" ? "warning" : "danger"})/0.15)]`}>
                {d === "Keep" ? <Icons.Check className="h-5 w-5 text-[hsl(var(--success))]" /> : d === "Modify" ? <Icons.PencilLine className="h-5 w-5 text-[hsl(var(--warning))]" /> : <Icons.X className="h-5 w-5 text-[hsl(var(--danger))]" />}
              </span>
              <div><p className="text-xl font-bold tabular-nums">{decisionTotals[d]}</p><p className="text-xs text-muted-foreground">{d}</p></div>
            </Card>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["All", ...activeAreas]).map((a) => (
          <button key={a} onClick={() => setAreaFilter(a)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${areaFilter === a ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>{a}</button>
        ))}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | "All")} className="ml-auto rounded-lg border bg-card px-3 py-1.5 text-sm outline-none">
          <option value="All">All statuses</option>
          {PROGRAM_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(decisionFilter !== "All" || statusFilter !== "All" || areaFilter !== "All") && (
          <button onClick={() => { setAreaFilter("All"); setStatusFilter("All"); setDecisionFilter("All"); }} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-secondary">Clear</button>
        )}
        {/* Search */}
        <div className="flex items-center gap-2">
          <Icons.Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or focus area…"
            className="rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent w-48"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          )}
        </div>
      </div>

      {loaded && (
        <p className="mt-3 text-xs text-muted-foreground">
          {shown.length} of {programs.length} program{programs.length !== 1 ? "s" : ""}
          {(areaFilter !== "All" || statusFilter !== "All" || decisionFilter !== "All" || q) && " match current filters"}
        </p>
      )}

      {!loaded ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-32 rounded bg-muted mb-3" />
              <div className="h-3 w-24 rounded bg-muted mb-2" />
              <div className="h-3 w-48 rounded bg-muted" />
            </Card>
          ))}
        </div>
      ) : (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {groups.map((a) => {
          const items = shown.filter((p) => p.area === a);
          if (items.length === 0) return null;
          return (
            <Card key={a} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{a}</h3>
                <Badge tone="muted">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((p) => (
                  <div key={p.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/programs/${p.id}`} className="text-sm font-semibold hover:text-accent hover:underline">
                        {p.name}
                      </Link>
                      {isAdmin && (
                        <button onClick={(e) => { e.preventDefault(); setEditing(p); setIsNew(false); }} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Edit">
                          <Icons.Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {(p.subFocus || p.department || p.region) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {p.subFocus && <Badge tone="muted">{p.subFocus}</Badge>}
                        {p.department && <span className="text-[11px] text-muted-foreground">{p.department}</span>}
                        {p.region && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{p.region}</span>}
                      </div>
                    )}
                    {p.questionZero && <p className="mt-1.5 text-xs italic text-muted-foreground">“{p.questionZero}”</p>}
                    <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Input (who):</span> {p.input || "—"}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Baseline:</span> {p.baseline || "—"}</p>
                    {p.target && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Target:</span> {p.target}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone="accent">Change: {p.outcome}</Badge>
                      {/* inline decision */}
                      <select value={p.decision} onChange={(e) => patch(p.id, { decision: e.target.value as Decision })} disabled={!isAdmin} className={`rounded-full px-2 py-0.5 text-xs font-medium outline-none ring-1 ring-inset ring-border bg-[hsl(var(--${p.decision === "Keep" ? "success" : p.decision === "Modify" ? "warning" : "danger"})/0.14)] ${!isAdmin ? "cursor-default opacity-100" : ""}`}>
                        {DECISION_STATUS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {/* inline status */}
                      <select value={p.status} onChange={(e) => patch(p.id, { status: e.target.value as ProgramStatus })} disabled={!isAdmin} className={`rounded-full border px-2 py-0.5 text-xs font-medium outline-none ${!isAdmin ? "cursor-default opacity-100 appearance-none" : ""}`}>
                        {PROGRAM_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">${p.budget.toLocaleString()}</span>
                    </div>

                    {/* team */}
                    <div className="mt-2 flex items-center gap-2">
                      <Icons.Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.team.length === 0 ? (
                        isAdmin ? (
                          <button onClick={() => { setEditing(p); setIsNew(false); }} className="text-xs text-accent hover:underline">Assign people</button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No team assigned</span>
                        )
                      ) : (
                        <div className="flex -space-x-1.5">
                          {p.team.map((id) => (
                            <span key={id} title={personName(id)} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground">{initials(personName(id))}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {shown.length === 0 && <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No programs match these filters.</p>}
      </div>
      )}

      {editing && isAdmin && (
        <ProgramModal
          program={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}

function ProgramModal({ program, isNew, onClose, onSave, onDelete }: {
  program: Program; isNew: boolean; onClose: () => void; onSave: (p: Program) => void; onDelete: (id: string) => void;
}) {
  const [p, setP] = useState<Program>(program);
  const set = (f: Partial<Program>) => setP((prev) => ({ ...prev, ...f }));
  const toggleMember = (id: string) => set({ team: p.team.includes(id) ? p.team.filter((x) => x !== id) : [...p.team, id] });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-card p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{isNew ? "Add Program" : "Edit Program"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><Icons.X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Program name"><input value={p.name} onChange={(e) => set({ name: e.target.value })} className="modal-input" placeholder="e.g. Youth Conference" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area of Focus">
              <select value={p.area} onChange={(e) => set({ area: e.target.value })} className="modal-input">
                {AREAS_OF_FOCUS.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Outcome (Change)">
              <select value={p.outcome} onChange={(e) => set({ outcome: e.target.value })} className="modal-input">
                {DESIRED_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Input — who is the target audience?"><input value={p.input} onChange={(e) => set({ input: e.target.value })} className="modal-input" placeholder="e.g. High School & College Youth" /></Field>
          <Field label="Baseline — expected output"><input value={p.baseline} onChange={(e) => set({ baseline: e.target.value })} className="modal-input" placeholder="e.g. 150 attendees · 2 Masajid" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Decision">
              <select value={p.decision} onChange={(e) => set({ decision: e.target.value as Decision })} className="modal-input">
                {DECISION_STATUS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={p.status} onChange={(e) => set({ status: e.target.value as ProgramStatus })} className="modal-input">
                {PROGRAM_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Budget ($)"><input type="number" value={p.budget} onChange={(e) => set({ budget: Number(e.target.value) })} className="modal-input" /></Field>
          </div>

          <Field label="Assign people">
            <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border p-2">
              {PEOPLE.map((person) => (
                <label key={person.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${p.team.includes(person.id) ? "bg-accent/10" : "hover:bg-secondary"}`}>
                  <input type="checkbox" checked={p.team.includes(person.id)} onChange={() => toggleMember(person.id)} />
                  <span className="truncate"><span className="font-medium">{person.name}</span> <span className="text-xs text-muted-foreground">· {person.roleType}</span></span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button onClick={() => onSave(p)} className="flex-1">{isNew ? "Add program" : "Save changes"}</Button>
          {!isNew && <Button variant="danger" onClick={() => onDelete(p.id)}><Icons.Trash2 className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
