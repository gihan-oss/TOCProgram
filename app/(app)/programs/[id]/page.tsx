"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Stat, Progress, Button, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { useApp } from "@/components/providers";
import { type Program } from "@/lib/mas";
import { loadPrograms } from "@/lib/programs-store";
import {
  TASK_STATUS, TASK_STATUS_LABEL, TASK_PRIORITIES, TASK_PRIORITY_LABEL, countTasks,
  FINANCIAL_TYPE_LABEL, INDICATOR_LEVELS, INDICATOR_LEVEL_LABEL,
  currentValue, progressPct, budgetTotal,
  type Task, type TaskStatus, type TaskPriority, type FinancialEntry, type FinancialType,
  type ProgramIndicator, type IndicatorLevel, type BudgetLine,
} from "@/lib/pm-types";
import {
  listTasks, createTask, updateTask, deleteTask,
  listFinancials, createFinancial, updateFinancial, deleteFinancial,
  listIndicators, createIndicator, updateIndicator, deleteIndicator, addMeasurement,
  listBudgetLines, saveBudgetLine, deleteBudgetLine,
} from "@/lib/pm-store";

type Tab = "overview" | "financial" | "tasks" | "me";
const TABS: { id: Tab; label: string; icon: keyof typeof Icons }[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "financial", label: "Financial", icon: "Wallet" },
  { id: "tasks", label: "Tasks", icon: "ListChecks" },
  { id: "me", label: "M&E", icon: "LineChart" },
];

const usd = (n: number) => "$" + Math.round(n || 0).toLocaleString();
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
type BadgeTone = "default" | "success" | "warning" | "danger" | "accent" | "muted";
const TASK_BADGE: Record<TaskStatus, BadgeTone> = { delayed_pending: "danger", in_progress: "warning", completed: "success", paused: "muted" };
const PRIORITY_BADGE: Record<TaskPriority, BadgeTone> = { low: "muted", medium: "accent", high: "warning", urgent: "danger" };

const inputCls = "w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-accent";

export default function ProgramDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <ProgramDetail />
    </Suspense>
  );
}

function ProgramDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [program, setProgram] = useState<Program | undefined>();
  const [programLoading, setProgramLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setProgramLoading(true);
    loadPrograms().then((list) => {
      if (!alive) return;
      setProgram(list.find((p) => p.id === id));
      setProgramLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  const { role: appRole } = useApp();
  const { user } = useAuth(); // still needed for mine() email matching
  const isAdmin = appRole === "admin";
  const canManage = isAdmin || appRole === "facilitator" || appRole === "coordinator";
  const isParticipant = appRole === "participant";

  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTabState] = useState<Tab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "overview"
  );
  function setTab(t: Tab) {
    setTabState(t);
    router.replace(`/programs/${id}?tab=${t}`, { scroll: false });
  }
  const [tasks, setTasks] = useState<Task[]>([]);
  const [financials, setFinancials] = useState<FinancialEntry[]>([]);
  const [indicators, setIndicators] = useState<ProgramIndicator[]>([]);
  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [tk, fn, ind, bl] = await Promise.all([
        listTasks(id), listFinancials(id), listIndicators(id), listBudgetLines(id),
      ]);
      if (!alive) return;
      setTasks(tk); setFinancials(fn); setIndicators(ind); setBudget(bl);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const mine = (t: Task) => {
    const who = (t.assignee ?? "").trim().toLowerCase();
    return who !== "" && (who === (user?.email ?? "").toLowerCase() || who === (user?.name ?? "").toLowerCase());
  };

  if (!program) {
    if (programLoading) {
      return (
        <div>
          <Link href="/programs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Icons.ChevronLeft className="h-4 w-4" /> Back to Programs
          </Link>
          <div className="grid gap-4 lg:grid-cols-2 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 w-32 rounded bg-muted mb-3" />
                <div className="h-3 w-24 rounded bg-muted mb-2" />
                <div className="h-3 w-48 rounded bg-muted" />
              </Card>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div>
        <Link href="/programs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icons.ChevronLeft className="h-4 w-4" /> Back to Programs
        </Link>
        <EmptyHint>That program couldn't be found. Open it from the Programs list.</EmptyHint>
      </div>
    );
  }

  const counts = countTasks(tasks);
  const budgetSum = budgetTotal(budget);
  const programBudget = program.budget || 0;
  const unassigned = programBudget - budgetSum;
  const incomeTotal = financials.filter((e) => e.type === "income").reduce((a, e) => a + e.amount, 0);
  const expenseTotal = financials.filter((e) => e.type === "expense").reduce((a, e) => a + e.amount, 0);
  const cashflow = incomeTotal - expenseTotal;

  return (
    <div>
      <Link href="/programs" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ChevronLeft className="h-4 w-4" /> Back to Programs
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
        {program.area && <Badge tone="muted">{program.area}</Badge>}
        {program.subFocus && <Badge tone="muted">{program.subFocus}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        {program.status} · Decision: {program.decision}{program.region ? ` · ${program.region}` : ""}
      </p>

      <div className="mt-5 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[t.icon] ?? Icons.Circle;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="pt-5">
          {tab === "overview" && (
            <OverviewTab program={program} canManage={canManage}
              programBudget={programBudget} budgetSum={budgetSum} unassigned={unassigned} cashflow={cashflow}
              openTasks={counts.total - counts.completed} completed={counts.completed} total={counts.total}
              indicatorCount={indicators.length} />
          )}
          {tab === "financial" && (
            <FinancialTab programId={id} entries={financials} budget={budget} canManage={canManage}
              programBudget={programBudget} budgetSum={budgetSum} unassigned={unassigned}
              income={incomeTotal} expense={expenseTotal} cashflow={cashflow}
              onAddEntry={async (i) => { const e = await createFinancial(i); setFinancials((p) => [e, ...p]); toast("Entry added"); }}
              onEditEntry={async (e, patch) => { const n = await updateFinancial(e, patch); setFinancials((p) => p.map((x) => x.id === n.id ? n : x)); toast("Entry updated"); }}
              onDeleteEntry={async (e) => { if (!window.confirm("Delete this entry?")) return; await deleteFinancial(e); setFinancials((p) => p.filter((x) => x.id !== e.id)); toast("Entry deleted"); }}
              onSaveLine={async (l) => { const n = await saveBudgetLine(l); setBudget((p) => p.some((x) => x.id === n.id) ? p.map((x) => x.id === n.id ? n : x) : [...p, n]); toast("Budget saved"); }}
              onDeleteLine={async (l) => { if (!window.confirm("Delete this budget line?")) return; await deleteBudgetLine(l); setBudget((p) => p.filter((x) => x.id !== l.id)); toast("Budget line removed"); }}
            />
          )}
          {tab === "tasks" && (
            <TasksTab programId={id} tasks={tasks} counts={counts} canManage={canManage} isParticipant={isParticipant} mine={mine}
              onCreate={async (i) => { const t = await createTask(i); setTasks((p) => [t, ...p]); toast("Task added"); }}
              onUpdate={async (t, patch) => { const n = await updateTask(t, patch); setTasks((p) => p.map((x) => x.id === n.id ? n : x)); }}
              onDelete={async (t) => { if (!window.confirm("Delete this task?")) return; await deleteTask(t); setTasks((p) => p.filter((x) => x.id !== t.id)); toast("Task deleted"); }}
            />
          )}
          {tab === "me" && (
            <MeTab programId={id} indicators={indicators} canManage={canManage}
              onCreate={async (i) => { const x = await createIndicator(i); setIndicators((p) => [...p, x]); toast("Indicator added"); }}
              onUpdate={async (i, patch) => { const n = await updateIndicator(i, patch); setIndicators((p) => p.map((x) => x.id === n.id ? n : x)); toast("Indicator updated"); }}
              onDelete={async (i) => { if (!window.confirm("Delete this indicator?")) return; await deleteIndicator(i); setIndicators((p) => p.filter((x) => x.id !== i.id)); toast("Indicator removed"); }}
              onMeasure={async (i, value, note) => { const n = await addMeasurement(i, { value, note }); setIndicators((p) => p.map((x) => x.id === n.id ? n : x)); toast("Measurement recorded"); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// OVERVIEW — read-only program details
// ===========================================================================
function OverviewTab({ program, canManage, programBudget, budgetSum, unassigned, cashflow, openTasks, completed, total, indicatorCount }: {
  program: Program; canManage: boolean;
  programBudget: number; budgetSum: number; unassigned: number; cashflow: number;
  openTasks: number; completed: number; total: number; indicatorCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cash flow" value={usd(cashflow)} hint={`Budget ${usd(programBudget)}`} tone={cashflow < 0 ? "danger" : "success"} />
        <Stat label="Open tasks" value={openTasks} hint={`${completed} completed of ${total}`} />
        <Stat label="Indicators" value={indicatorCount} hint="Tracked in M&E" />
        <Stat label="Budget" value={usd(programBudget)} hint={budgetSum > 0 ? `${usd(budgetSum)} assigned` : "Not broken down"} />
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Program details</h3>
        <div className="space-y-4">
          {program.questionZero && (
            <p className="text-sm italic text-muted-foreground">"{program.questionZero}"</p>
          )}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Input (who)" value={program.input} />
            <Field label="Desired change" value={program.outcome} />
            <Field label="Baseline" value={program.baseline} />
            <Field label="Target" value={program.target} />
            <Field label="Area of focus" value={program.area} />
            <Field label="Sub-area" value={program.subFocus} />
            <Field label="Status" value={program.status} />
            <Field label="Decision" value={program.decision} />
            <Field label="Region" value={program.region} />
          </div>
        </div>
      </Card>
    </div>
  );
}
function Field({ label, value }: { label: string; value?: string }) {
  return <div><span className="font-medium">{label}:</span> <span className="text-muted-foreground">{value || "—"}</span></div>;
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

// ===========================================================================
// FINANCIAL — Budget model B (lines by category) + ledger
// ===========================================================================
function FinancialTab({ programId, entries, budget, canManage, programBudget, budgetSum, unassigned, income, expense, cashflow, onAddEntry, onEditEntry, onDeleteEntry, onSaveLine, onDeleteLine }: {
  programId: string; entries: FinancialEntry[]; budget: BudgetLine[]; canManage: boolean;
  programBudget: number; budgetSum: number; unassigned: number;
  income: number; expense: number; cashflow: number;
  onAddEntry: (i: Omit<FinancialEntry, "id" | "createdAt">) => Promise<void>;
  onEditEntry: (e: FinancialEntry, patch: Partial<FinancialEntry>) => Promise<void>;
  onDeleteEntry: (e: FinancialEntry) => Promise<void>;
  onSaveLine: (l: Omit<BudgetLine, "id"> & { id?: string }) => Promise<void>;
  onDeleteLine: (l: BudgetLine) => Promise<void>;
}) {
  const usedPct = programBudget > 0 ? Math.round((expense / programBudget) * 100) : null;

  // budget line add/edit form
  const [bCat, setBCat] = useState(""); const [bDesc, setBDesc] = useState(""); const [bAmt, setBAmt] = useState(""); const [bEdit, setBEdit] = useState<string | null>(null);
  async function submitLine() {
    if (!bCat.trim() || !bAmt) return;
    await onSaveLine({ id: bEdit ?? undefined, programId, category: bCat.trim(), description: bDesc || undefined, amount: Number(bAmt) });
    setBCat(""); setBDesc(""); setBAmt(""); setBEdit(null);
  }
  function editLine(l: BudgetLine) { setBEdit(l.id); setBCat(l.category); setBDesc(l.description ?? ""); setBAmt(String(l.amount)); }

  // ledger add form
  const [type, setType] = useState<FinancialType>("expense");
  const [amount, setAmount] = useState(""); const [desc, setDesc] = useState(""); const [cat, setCat] = useState(""); const [date, setDate] = useState("");
  async function submitEntry() {
    if (!amount) return;
    await onAddEntry({ programId, type, amount: Number(amount), description: desc || undefined, category: cat || undefined, date: date || new Date().toISOString().slice(0, 10) });
    setAmount(""); setDesc(""); setCat(""); setDate("");
  }

  const [editEntry, setEditEntry] = useState<FinancialEntry | null>(null);

  // variance by category: budgeted from budget lines, spent from expense entries
  const variance = useMemo(() => {
    const budgeted = new Map<string, number>();
    for (const l of budget) budgeted.set(l.category, (budgeted.get(l.category) ?? 0) + l.amount);
    const spent = new Map<string, number>();
    for (const e of entries) {
      if (e.type === "expense" && e.category) spent.set(e.category, (spent.get(e.category) ?? 0) + e.amount);
    }
    const cats = new Set([...budgeted.keys(), ...spent.keys()]);
    return Array.from(cats).map((cat) => {
      const b = budgeted.get(cat) ?? 0;
      const s = spent.get(cat) ?? 0;
      const remaining = b - s;
      const usedPct = b > 0 ? Math.round((s / b) * 100) : null;
      return { category: cat, budgeted: b, spent: s, remaining, usedPct };
    });
  }, [budget, entries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Budget" value={usd(programBudget)}
          hint={budgetSum > 0 ? `${usd(budgetSum)} assigned · ${usd(Math.max(0, unassigned))} unassigned` : "Not broken into categories"} />
        <Stat label="Income" value={usd(income)} tone="success" />
        <Stat label="Expense" value={usd(expense)} tone="warning"
          hint={programBudget > 0 ? `${Math.round((expense / programBudget) * 100)}% of budget used` : undefined} />
        <Stat label="Cash Flow" value={usd(cashflow)} tone={cashflow < 0 ? "danger" : "success"} />
      </div>

      {programBudget > 0 && (
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">Budget utilisation</span>
            <span className="text-muted-foreground">{usd(expense)} spent of {usd(programBudget)}</span>
          </div>
          <Progress value={usedPct ?? 0} tone={usedPct !== null && usedPct > 100 ? "danger" : usedPct !== null && usedPct > 85 ? "warning" : "success"} />
        </Card>
      )}

      {/* Budget by category */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Budget by category</h3>
        {budget.length > 0 || programBudget > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Category</th><th className="py-2">Description</th><th className="py-2 text-right">Amount</th><th /></tr></thead>
                <tbody className="divide-y">
                  {budget.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 font-medium">{l.category}</td>
                      <td className="py-2 text-muted-foreground">{l.description || "—"}</td>
                      <td className="py-2 text-right tabular-nums">{usd(l.amount)}</td>
                      <td className="py-2 text-right">
                        {canManage && (
                          <span className="inline-flex gap-1">
                            <button onClick={() => editLine(l)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Edit"><Icons.Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => onDeleteLine(l)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-[hsl(var(--danger))]" aria-label="Delete"><Icons.Trash2 className="h-3.5 w-3.5" /></button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {budget.length === 0 && programBudget > 0 && (
                    <tr className="text-muted-foreground">
                      <td className="py-2 italic">Unassigned</td>
                      <td className="py-2 text-xs text-muted-foreground">Full budget not yet broken into categories</td>
                      <td className="py-2 text-right tabular-nums">{usd(programBudget)}</td>
                      <td />
                    </tr>
                  )}
                  {unassigned > 0 && budget.length > 0 && (
                    <tr className="text-muted-foreground">
                      <td className="py-2 italic">Unassigned</td>
                      <td className="py-2 text-xs text-muted-foreground">Not yet broken into categories</td>
                      <td className="py-2 text-right tabular-nums">{usd(unassigned)}</td>
                      <td />
                    </tr>
                  )}
                  {unassigned < 0 && (
                    <tr className="text-[hsl(var(--warning))]">
                      <td className="py-2 font-medium">Over budget</td>
                      <td className="py-2 text-xs">Budget lines exceed total by {usd(-unassigned)}</td>
                      <td className="py-2 text-right tabular-nums">{usd(unassigned)}</td>
                      <td />
                    </tr>
                  )}
                  <tr className="font-semibold"><td className="py-2">Total</td><td /><td className="py-2 text-right tabular-nums">{usd(programBudget)}</td><td /></tr>
                </tbody>
              </table>
            </div>
            {budget.length === 0 && programBudget > 0 && canManage && (
              <p className="mt-3 text-xs text-muted-foreground">
                Add budget line items below to assign portions of this {usd(programBudget)} budget to specific categories.
              </p>
            )}
          </div>
        ) : <EmptyHint>No budget lines yet.{canManage ? " Add categories below." : ""}</EmptyHint>}
        {canManage && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className={inputCls} placeholder="Category (e.g. Travel)" value={bCat} onChange={(e) => setBCat(e.target.value)} />
            <input className={inputCls} placeholder="Description" value={bDesc} onChange={(e) => setBDesc(e.target.value)} />
            <input className={inputCls} type="number" step="any" placeholder="Amount" value={bAmt} onChange={(e) => setBAmt(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitLine} disabled={!bCat.trim() || !bAmt}>{bEdit ? "Update" : "Add"} line</Button>
              {bEdit && <Button size="sm" variant="outline" onClick={() => { setBEdit(null); setBCat(""); setBDesc(""); setBAmt(""); }}>Cancel</Button>}
            </div>
          </div>
        )}
      </Card>

      {/* Variance */}
      {variance.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Budget vs actual</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Category</th><th className="py-2 text-right">Budgeted</th><th className="py-2 text-right">Spent</th><th className="py-2 text-right">Remaining</th><th className="py-2 text-right">Used</th></tr></thead>
              <tbody className="divide-y">
                {variance.map((v) => (
                  <tr key={v.category}>
                    <td className="py-2 font-medium">{v.category}</td>
                    <td className="py-2 text-right tabular-nums">{usd(v.budgeted)}</td>
                    <td className="py-2 text-right tabular-nums">{usd(v.spent)}</td>
                    <td className={`py-2 text-right tabular-nums ${v.remaining < 0 ? "text-[hsl(var(--danger))]" : ""}`}>{usd(v.remaining)}</td>
                    <td className="py-2 text-right tabular-nums">{v.usedPct === null ? "—" : `${v.usedPct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ledger */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Transactions ({entries.length})</h3>
        {entries.length === 0 ? <EmptyHint>No income or expense entries yet.</EmptyHint> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Type</th><th className="py-2 text-right">Amount</th><th className="py-2">Description</th><th className="py-2">Category</th><th className="py-2">Date</th><th /></tr></thead>
              <tbody className="divide-y">
                {entries.map((e) => editEntry?.id === e.id ? (
                  <EntryEditRow key={e.id} entry={e} onCancel={() => setEditEntry(null)} onSave={async (patch) => { await onEditEntry(e, patch); setEditEntry(null); }} />
                ) : (
                  <tr key={e.id}>
                    <td className="py-2"><Badge tone={e.type === "expense" ? "warning" : e.type === "income" ? "success" : "muted"}>{FINANCIAL_TYPE_LABEL[e.type]}</Badge></td>
                    <td className="py-2 text-right font-medium tabular-nums">{usd(e.amount)}</td>
                    <td className="py-2 text-muted-foreground">{e.description || "—"}</td>
                    <td className="py-2 text-muted-foreground">{e.category || "—"}</td>
                    <td className="py-2 text-muted-foreground">{fmtDate(e.date)}</td>
                    <td className="py-2 text-right">
                      {canManage && (
                        <span className="inline-flex gap-1">
                          <button onClick={() => setEditEntry(e)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Edit"><Icons.Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => onDeleteEntry(e)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-[hsl(var(--danger))]" aria-label="Delete"><Icons.Trash2 className="h-3.5 w-3.5" /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canManage && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as FinancialType)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input className={inputCls} type="number" step="any" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className={`${inputCls} lg:col-span-2`} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <input className={inputCls} placeholder="Category" value={cat} onChange={(e) => setCat(e.target.value)} />
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="lg:col-span-6"><Button size="sm" onClick={submitEntry} disabled={!amount}><Icons.Plus className="h-4 w-4" /> Add transaction</Button></div>
          </div>
        )}
      </Card>
    </div>
  );
}

function EntryEditRow({ entry, onCancel, onSave }: { entry: FinancialEntry; onCancel: () => void; onSave: (patch: Partial<FinancialEntry>) => Promise<void> }) {
  const [type, setType] = useState<FinancialType>(entry.type);
  const [amount, setAmount] = useState(String(entry.amount));
  const [desc, setDesc] = useState(entry.description ?? "");
  const [cat, setCat] = useState(entry.category ?? "");
  const [date, setDate] = useState(entry.date ?? "");
  return (
    <tr className="bg-secondary/40">
      <td className="py-1"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value as FinancialType)}><option value="expense">Expense</option><option value="income">Income</option><option value="budget">Budget</option></select></td>
      <td className="py-1"><input className={inputCls} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></td>
      <td className="py-1"><input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} /></td>
      <td className="py-1"><input className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)} /></td>
      <td className="py-1"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></td>
      <td className="py-1 text-right"><span className="inline-flex gap-1">
        <button onClick={() => onSave({ type, amount: Number(amount), description: desc || undefined, category: cat || undefined, date })} className="rounded-md p-1 text-[hsl(var(--success))] hover:bg-secondary" aria-label="Save"><Icons.Check className="h-4 w-4" /></button>
        <button onClick={onCancel} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Cancel"><Icons.X className="h-4 w-4" /></button>
      </span></td>
    </tr>
  );
}

// ===========================================================================
// TASKS — with priority + full edit
// ===========================================================================
function TasksTab({ programId, tasks, counts, canManage, isParticipant, mine, onCreate, onUpdate, onDelete }: {
  programId: string; tasks: Task[]; counts: ReturnType<typeof countTasks>; canManage: boolean; isParticipant: boolean;
  mine: (t: Task) => boolean;
  onCreate: (i: Omit<Task, "id" | "createdAt" | "completedAt">) => Promise<void>;
  onUpdate: (t: Task, patch: Partial<Task>) => Promise<void>;
  onDelete: (t: Task) => Promise<void>;
}) {
  const [title, setTitle] = useState(""); const [assignee, setAssignee] = useState(""); const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [editId, setEditId] = useState<string | null>(null);

  const shown = isParticipant ? tasks.filter(mine) : tasks;
  const cards: { key: TaskStatus; label: string; bg: string; text: string }[] = [
    { key: "delayed_pending", label: "Delayed/Pending", bg: "bg-[hsl(var(--danger)/0.12)]", text: "text-[hsl(var(--danger))]" },
    { key: "in_progress", label: "In Progress", bg: "bg-[hsl(var(--warning)/0.15)]", text: "text-[hsl(var(--warning))]" },
    { key: "completed", label: "Completed", bg: "bg-[hsl(var(--success)/0.15)]", text: "text-[hsl(var(--success))]" },
    { key: "paused", label: "Paused", bg: "bg-secondary", text: "text-muted-foreground" },
  ];
  const max = Math.max(1, counts.delayed_pending, counts.in_progress, counts.completed, counts.paused);

  async function submit() {
    if (!title.trim()) return;
    await onCreate({ programId, title: title.trim(), status: "delayed_pending", assignee: assignee || undefined, dueDate: dueDate || undefined, priority });
    setTitle(""); setAssignee(""); setDueDate(""); setPriority("medium");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {cards.map((c) => (
            <div key={c.key} className={`rounded-xl p-4 ${c.bg}`}>
              <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
              <p className={`mt-2 text-3xl font-bold tabular-nums ${c.text}`}>{counts[c.key]}</p>
            </div>
          ))}
        </div>
        <Card className="flex items-end justify-around gap-2 p-4">
          {cards.map((c) => (
            <div key={c.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className={`w-full rounded-t ${c.bg}`} style={{ height: `${(counts[c.key] / max) * 100}%`, minHeight: counts[c.key] ? 6 : 0 }} />
              <span className="text-[10px] text-muted-foreground">{counts[c.key]}</span>
            </div>
          ))}
        </Card>
      </div>

      {canManage && (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Add a task</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input className={`${inputCls} lg:col-span-2`} placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className={inputCls} placeholder="Assignee (name or email)" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
            </select>
            <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="mt-3"><Button size="sm" onClick={submit} disabled={!title.trim()}><Icons.Plus className="h-4 w-4" /> Add task</Button></div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">{isParticipant ? "My tasks" : "All tasks"} ({shown.length})</h3>
        {shown.length === 0 ? <EmptyHint>{isParticipant ? "No tasks assigned to you on this program." : "No tasks yet."}</EmptyHint> : (
          <div className="space-y-2">
            {shown.map((t) => editId === t.id && canManage ? (
              <TaskEditRow key={t.id} task={t} onCancel={() => setEditId(null)} onSave={async (patch) => { await onUpdate(t, patch); setEditId(null); }} />
            ) : (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.title}</p>
                    {t.priority && <Badge tone={PRIORITY_BADGE[t.priority]}>{TASK_PRIORITY_LABEL[t.priority]}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.assignee || "Unassigned"} · Due {fmtDate(t.dueDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={TASK_BADGE[t.status]}>{TASK_STATUS_LABEL[t.status]}</Badge>
                  {(canManage || (isParticipant && mine(t))) && (
                    <select className="rounded-lg border bg-card px-2 py-1 text-xs outline-none" value={t.status} onChange={(e) => onUpdate(t, { status: e.target.value as TaskStatus })}>
                      {TASK_STATUS.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
                    </select>
                  )}
                  {canManage && <button onClick={() => setEditId(t.id)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Edit"><Icons.Pencil className="h-4 w-4" /></button>}
                  {canManage && <button onClick={() => onDelete(t)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-[hsl(var(--danger))]" aria-label="Delete"><Icons.Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TaskEditRow({ task, onCancel, onSave }: { task: Task; onCancel: () => void; onSave: (patch: Partial<Task>) => Promise<void> }) {
  const [title, setTitle] = useState(task.title);
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [description, setDescription] = useState(task.description ?? "");
  return (
    <div className="rounded-lg border bg-secondary/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input className={`${inputCls} lg:col-span-2`} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputCls} placeholder="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}</select>
        <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>{TASK_STATUS.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}</select>
        <input className={`${inputCls} lg:col-span-4`} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onSave({ title: title.trim(), assignee: assignee || undefined, dueDate: dueDate || undefined, priority, status, description: description || undefined })} disabled={!title.trim()}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ===========================================================================
// M&E — indicators with edit + measurements
// ===========================================================================
function MeTab({ programId, indicators, canManage, onCreate, onUpdate, onDelete, onMeasure }: {
  programId: string; indicators: ProgramIndicator[]; canManage: boolean;
  onCreate: (i: Omit<ProgramIndicator, "id" | "createdAt" | "measurements">) => Promise<void>;
  onUpdate: (i: ProgramIndicator, patch: Partial<ProgramIndicator>) => Promise<void>;
  onDelete: (i: ProgramIndicator) => Promise<void>;
  onMeasure: (i: ProgramIndicator, value: number, note: string | undefined) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [level, setLevel] = useState<IndicatorLevel>("outcome");
  const [unit, setUnit] = useState(""); const [baseline, setBaseline] = useState("0"); const [target, setTarget] = useState("100");

  async function submit() {
    if (!name.trim()) return;
    await onCreate({ programId, name: name.trim(), type: "Quantitative", level, unit: unit || undefined, baseline: Number(baseline) || 0, target: Number(target) || 0, current: 0 });
    setName(""); setUnit(""); setBaseline("0"); setTarget("100"); setLevel("outcome"); setAdding(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Indicators by level. Current value is the latest measurement.</p>
        {canManage && <Button size="sm" variant={adding ? "outline" : "primary"} onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : <><Icons.Plus className="h-4 w-4" /> Add indicator</>}</Button>}
      </div>

      {adding && canManage && (
        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input className={`${inputCls} lg:col-span-2`} placeholder="Indicator name" value={name} onChange={(e) => setName(e.target.value)} />
            <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as IndicatorLevel)}>{INDICATOR_LEVELS.map((l) => <option key={l} value={l}>{INDICATOR_LEVEL_LABEL[l]}</option>)}</select>
            <input className={inputCls} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <div className="flex gap-2">
              <input className={inputCls} type="number" step="any" placeholder="Baseline" value={baseline} onChange={(e) => setBaseline(e.target.value)} />
              <input className={inputCls} type="number" step="any" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          </div>
          <div className="mt-3"><Button size="sm" onClick={submit} disabled={!name.trim()}>Save indicator</Button></div>
        </Card>
      )}

      {indicators.length === 0 ? <EmptyHint>No indicators yet.{canManage ? " Add one above." : ""}</EmptyHint> : (
        INDICATOR_LEVELS.map((lvl) => {
          const group = indicators.filter((i) => i.level === lvl);
          if (group.length === 0) return null;
          return (
            <div key={lvl}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{INDICATOR_LEVEL_LABEL[lvl]} indicators</h3>
              <div className="space-y-3">{group.map((ind) => <IndicatorRow key={ind.id} ind={ind} canManage={canManage} onUpdate={onUpdate} onDelete={onDelete} onMeasure={onMeasure} />)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}

function IndicatorRow({ ind, canManage, onUpdate, onDelete, onMeasure }: {
  ind: ProgramIndicator; canManage: boolean;
  onUpdate: (i: ProgramIndicator, patch: Partial<ProgramIndicator>) => Promise<void>;
  onDelete: (i: ProgramIndicator) => Promise<void>;
  onMeasure: (i: ProgramIndicator, value: number, note: string | undefined) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(""); const [note, setNote] = useState("");
  // edit fields
  const [name, setName] = useState(ind.name); const [level, setLevel] = useState<IndicatorLevel>(ind.level);
  const [unit, setUnit] = useState(ind.unit ?? ""); const [baseline, setBaseline] = useState(String(ind.baseline)); const [target, setTarget] = useState(String(ind.target));

  const cur = currentValue(ind);
  const pct = progressPct(ind);
  const tone: "accent" | "success" | "warning" | "danger" = pct >= 80 ? "success" : pct >= 50 ? "warning" : "danger";

  async function record() {
    const v = Number(value);
    if (Number.isNaN(v) || value === "") return;
    await onMeasure(ind, v, note || undefined); setValue(""); setNote("");
  }
  async function saveEdit() {
    await onUpdate(ind, { name: name.trim(), level, unit: unit || undefined, baseline: Number(baseline) || 0, target: Number(target) || 0 });
    setEditing(false);
  }

  if (editing) {
    return (
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className={`${inputCls} lg:col-span-2`} value={name} onChange={(e) => setName(e.target.value)} />
          <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as IndicatorLevel)}>{INDICATOR_LEVELS.map((l) => <option key={l} value={l}>{INDICATOR_LEVEL_LABEL[l]}</option>)}</select>
          <input className={inputCls} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <div className="flex gap-2"><input className={inputCls} type="number" step="any" value={baseline} onChange={(e) => setBaseline(e.target.value)} /><input className={inputCls} type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        </div>
        <div className="mt-3 flex gap-2"><Button size="sm" onClick={saveEdit} disabled={!name.trim()}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="font-medium">{ind.name}</p>{ind.description && <p className="text-xs text-muted-foreground">{ind.description}</p>}</div>
        <div className="flex items-center gap-3 text-sm tabular-nums">
          <span className="text-muted-foreground">Base {ind.baseline}{ind.unit ? ` ${ind.unit}` : ""}</span>
          <span className="font-semibold">Now {Number.isNaN(cur) ? "—" : cur.toFixed(1)}</span>
          <span className="text-muted-foreground">Target {ind.target}{ind.unit ? ` ${ind.unit}` : ""}</span>
          {canManage && <button onClick={() => setEditing(true)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Edit"><Icons.Pencil className="h-4 w-4" /></button>}
          {canManage && <button onClick={() => onDelete(ind)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-[hsl(var(--danger))]" aria-label="Delete"><Icons.Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3"><Progress value={pct > 100 ? 100 : pct < 0 ? 0 : pct} tone={tone} className="flex-1" /><span className="w-12 text-right text-sm font-medium">{`${pct}%`}</span></div>
      <div className="mt-2"><button onClick={() => setOpen((v) => !v)} className="text-xs text-accent hover:underline">{ind.measurements.length} measurement{ind.measurements.length === 1 ? "" : "s"} {open ? "▲" : "▼"}</button></div>
      {open && (
        <div className="mt-2 space-y-2">
          {ind.measurements.length > 0 && (
            <div className="rounded-lg border">
              {ind.measurements.map((m, i) => (
                <div key={i} className="flex items-center justify-between border-b px-3 py-1.5 text-xs last:border-b-0">
                  <span className="font-medium tabular-nums">{m.value}{ind.unit ? ` ${ind.unit}` : ""}</span>
                  <span className="text-muted-foreground">{m.note || ""}</span>
                  <span className="text-muted-foreground">{m.date}</span>
                </div>
              ))}
            </div>
          )}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <input className="w-28 rounded-lg border bg-card px-3 py-2 text-sm outline-none" type="number" step="any" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
              <input className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm outline-none" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" onClick={record} disabled={value === ""}>Record</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
