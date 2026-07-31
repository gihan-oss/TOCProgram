"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, Progress, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { listAllIndicators, createIndicator, updateIndicator, deleteIndicator } from "@/lib/pm-store";
import type { ProgramIndicator } from "@/lib/pm-types";

function progressOf(i: ProgramIndicator) {
  if (i.target === i.baseline) return 100;
  return Math.round(((i.current - i.baseline) / (i.target - i.baseline)) * 100);
}

export default function MeasurementPage() {
  const [indicators, setIndicators] = useState<ProgramIndicator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const itemRef = useRef<Map<string, ProgramIndicator>>(new Map());
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    listAllIndicators(user?.email).then((data) => { setIndicators(data); setLoaded(true); });
  }, [user?.email]);

  // Keep a ref so the debounced save always has the latest item.
  useEffect(() => { for (const i of indicators) itemRef.current.set(i.id, i); }, [indicators]);

  const persist = useCallback((id: string) => {
    const t = debounceRef.current.get(id);
    if (t) clearTimeout(t);
    debounceRef.current.set(
      id,
      setTimeout(async () => {
        const next = itemRef.current.get(id);
        if (!next) return;
        await updateIndicator(next, {});
        debounceRef.current.delete(id);
      }, 600),
    );
  }, []);

  function update(id: string, current: number) {
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, current } : i)));
    persist(id);
  }

  async function addIndicator() {
    const ind = await createIndicator({
      email: user?.email ?? undefined,
      name: "New indicator",
      type: "Quantitative",
      level: "output",
      baseline: 0,
      target: 100,
      current: 0,
      targetDate: "2026-12-31",
      frequency: "Quarterly",
      meansOfVerification: "Define a source\u2026",
      unit: "",
    });
    setIndicators((prev) => [...prev, ind]);
    setEditing(ind.id);
    toast("Indicator added \u2014 set its current value");
  }

  async function removeIndicator(id: string) {
    if (!window.confirm("Delete this indicator?")) return;
    const ind = indicators.find((i) => i.id === id);
    if (!ind) return;
    setIndicators((prev) => prev.filter((i) => i.id !== id));
    await deleteIndicator(ind);
    toast("Indicator removed");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Measurement Plan Builder</h1>
          <p className="text-sm text-muted-foreground">SMART indicators with baselines, targets, frequency and means of verification \u2014 quantitative &amp; qualitative</p>
        </div>
        <button onClick={addIndicator} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icons.Plus className="h-4 w-4" /> Add indicator
        </button>
      </div>

      {!loaded ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Card key={i} className="h-32 animate-pulse p-5"><div className="h-4 w-3/4 rounded bg-muted" /><div className="mt-4 h-3 w-1/2 rounded bg-muted" /></Card>)}
        </div>
      ) : indicators.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No indicators yet. Add one to start tracking progress.</p>
      ) : (
      <div className="grid gap-4">
        {indicators.map((ind) => {
          const prog = progressOf(ind);
          const tone = prog >= 80 ? "success" : prog >= 50 ? "warning" : "danger";
          const open = editing === ind.id;
          return (
            <Card key={ind.id} className="group relative p-5">
              <button
                onClick={() => removeIndicator(ind.id)}
                className="absolute right-3 top-3 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] group-hover:opacity-100"
                title="Delete"
              >
                <Icons.Trash2 className="h-4 w-4" />
              </button>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{ind.name}</h3>
                    <Badge tone={ind.type === "Quantitative" ? "accent" : "muted"}>{ind.type}</Badge>
                    <Badge tone="muted" className="capitalize">{ind.level}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Icons.FileCheck className="mr-1 inline h-3.5 w-3.5" />MoV: {ind.meansOfVerification} &middot; {ind.frequency} &middot; target {ind.targetDate}
                  </p>
                </div>
                <button onClick={() => setEditing(open ? null : ind.id)} className="rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                  {open ? "Done" : "Update value"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Baseline</p>
                  <p className="text-lg font-semibold tabular-nums">{ind.baseline}{ind.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  {open ? (
                    <input
                      type="number"
                      value={ind.current}
                      onChange={(e) => update(ind.id, Number(e.target.value))}
                      className="mx-auto mt-0.5 w-20 rounded-md border bg-background px-2 py-1 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <p className={`text-lg font-semibold tabular-nums text-[hsl(var(--${tone}))]`}>{ind.current}{ind.unit}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-lg font-semibold tabular-nums">{ind.target}{ind.unit}</p>
                </div>
              </div>

              <div className="mt-3">
                <Progress value={prog} tone={tone} />
                <p className="mt-1 text-right text-xs text-muted-foreground">{prog}% to target</p>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
