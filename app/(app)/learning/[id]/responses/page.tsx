"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { Card, Button, Badge, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { CLIENT } from "@/lib/mas";
import { effectiveModules } from "@/lib/starter-course";
import { loadModules, resetWorksheetResponses, type CourseModule, type Resource, type WorksheetField } from "@/lib/content";
import { listLearnerProgress, listProfiles, listMembers } from "@/lib/store";
import { ResponsesPresent, type PresentPrompt } from "@/components/responses-present";
import { useToast } from "@/components/toast";

// How often the wall re-fetches, so new responses appear "live" during a
// session. Polling (not realtime sockets) keeps it simple and reliable.
const REFRESH_MS = 4000;

interface Answered { name: string; value: string }

export default function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const toast = useToast();
  const canView = user?.role === "admin" || user?.role === "facilitator" || user?.role === "coordinator";
  const [resetting, setResetting] = useState(false);

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [nameByEmail, setNameByEmail] = useState<Record<string, string>>({});
  const [answersByField, setAnswersByField] = useState<Record<string, Answered[]>>({});
  const [respondents, setRespondents] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    loadModules().then((m) => { setModules(effectiveModules(m)); });
  }, []);

  const module = modules.find((m) => m.id === id);
  const moduleIndex = module ? modules.findIndex((m) => m.id === id) : -1;
  const worksheets = useMemo<Resource[]>(
    () => (module ? module.resources.filter((r) => r.type === "Worksheet") : []),
    [module],
  );
  // Flat, ordered list of every prompt across the module's worksheets — one per
  // slide in the Mentimeter-style present view.
  const prompts = useMemo<PresentPrompt[]>(
    () => worksheets.flatMap((ws) => (ws.fields ?? []).map((f) => ({ fieldId: f.id, label: f.label, kind: f.kind, wsTitle: ws.title }))),
    [worksheets],
  );

  const refresh = useCallback(async () => {
    if (!canView || worksheets.length === 0) return;
    setRefreshing(true);
    const [progress, profiles, members] = await Promise.all([
      listLearnerProgress(),
      listProfiles(),
      listMembers(),
    ]);

    // email -> best display name (profile name wins, then member name, then local part)
    const names: Record<string, string> = {};
    members.forEach((m) => { names[m.email.toLowerCase()] = m.name || m.email.split("@")[0]; });
    profiles.forEach((p) => { if (p.name) names[p.email.toLowerCase()] = p.name; });
    setNameByEmail(names);

    // Bucket every answer under its worksheet field id.
    const byField: Record<string, Answered[]> = {};
    const responded = new Set<string>();
    for (const row of progress) {
      const email = row.email.toLowerCase();
      const name = names[email] || email.split("@")[0];
      const sheets = row.meta?.worksheets ?? {};
      for (const ws of worksheets) {
        const ans = sheets[ws.id];
        if (!ans) continue;
        for (const f of ws.fields ?? []) {
          const v = (ans[f.id] ?? "").trim();
          if (!v) continue;
          (byField[f.id] ??= []).push({ name, value: v });
          responded.add(email);
        }
      }
    }
    // Stable, friendly ordering.
    Object.values(byField).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    setAnswersByField(byField);
    setRespondents(responded.size);
    setLastSync(Date.now());
    setLoaded(true);
    setRefreshing(false);
  }, [canView, worksheets]);

  // Initial + polling refresh while "live" is on.
  useEffect(() => {
    if (worksheets.length === 0) { if (modules.length) setLoaded(true); return; }
    void refresh();
    if (!live) return;
    const t = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh, live, worksheets.length, modules.length]);

  // Clear ALL responses for this module's worksheet(s) — a fresh start for the
  // next group. Destructive (deletes everyone's saved answers here), so confirm.
  async function handleReset() {
    const ids = worksheets.map((w) => w.id);
    if (ids.length === 0) return;
    if (!window.confirm("Clear ALL responses for this worksheet? This permanently deletes everyone's saved answers here — use it to start fresh with a new group. This can't be undone.")) return;
    setResetting(true);
    const res = await resetWorksheetResponses(ids);
    setResetting(false);
    if (res.ok) {
      setAnswersByField({});
      setRespondents(0);
      toast(res.cleared != null ? `Cleared — ${res.cleared} ${res.cleared === 1 ? "response" : "responses"} removed` : "Responses cleared");
      void refresh();
    } else {
      toast(res.error || "Couldn't reset responses", "error");
    }
  }

  if (modules.length > 0 && !module) return notFound();

  if (!canView) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyHint>Live responses are for facilitators, coordinators and admins.</EmptyHint>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/learning/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ArrowLeft className="h-4 w-4" /> Back to module
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {CLIENT.tocTitle}{moduleIndex >= 0 ? ` · Module ${moduleIndex + 1}` : ""} · Live responses
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{module?.title ?? "Responses"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {respondents} {respondents === 1 ? "person has" : "people have"} responded so far.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prompts.length > 0 && (
            <Button size="sm" onClick={() => setPresenting(true)}>
              <Icons.Presentation className="h-4 w-4" /> Present
            </Button>
          )}
          <Button size="sm" variant={live ? "primary" : "outline"} onClick={() => setLive((v) => !v)}>
            <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-white" : "bg-muted-foreground"}`} />
            {live ? "Live" : "Paused"}
          </Button>
          <Button size="sm" variant="outline" disabled={refreshing} onClick={() => void refresh()}>
            <Icons.RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          {respondents > 0 && user?.role !== "coordinator" && (
            <Button size="sm" variant="danger" disabled={resetting} onClick={() => void handleReset()}>
              <Icons.Trash2 className="h-4 w-4" /> {resetting ? "Resetting…" : "Reset"}
            </Button>
          )}
        </div>
      </div>

      {presenting && (
        <ResponsesPresent
          moduleTitle={module?.title ?? "Responses"}
          prompts={prompts}
          answersByField={answersByField}
          onClose={() => setPresenting(false)}
        />
      )}

      {!loaded ? (
        <div className="flex justify-center py-24"><Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : worksheets.length === 0 ? (
        <div className="mt-6"><EmptyHint>This module has no worksheet, so there are no responses to show.</EmptyHint></div>
      ) : respondents === 0 ? (
        // No fake/placeholder prompt cards — a single, honest empty state until
        // real answers arrive.
        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
          <Icons.Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No responses yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Answers show up here live as people fill in the worksheet — from the module or the shared link.
            This page updates on its own; you can also hit Refresh.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {worksheets.map((ws) => {
            // Only render prompts that actually have answers — no empty placeholders.
            const answered = (ws.fields ?? []).filter((f) => (answersByField[f.id] ?? []).length > 0);
            if (answered.length === 0) return null;
            return (
              <section key={ws.id}>
                {worksheets.length > 1 && (
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Icons.PencilRuler className="h-4 w-4 text-accent" /> {ws.title}
                  </h2>
                )}
                <div className="space-y-5">
                  {answered.map((f) => (
                    <FieldResponses key={f.id} index={(ws.fields ?? []).indexOf(f)} field={f} responses={answersByField[f.id] ?? []} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {lastSync && (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Updates every {REFRESH_MS / 1000}s while live · last updated {new Date(lastSync).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// One prompt and everyone's answers to it. Dropdown prompts (Area of Focus /
// Outcome) show a tally bar; written prompts show a wall of answer cards.
function FieldResponses({ index, field, responses }: { index: number; field: WorksheetField; responses: Answered[] }) {
  const isChoice = field.kind === "area" || field.kind === "outcome";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{index + 1}</span>
          <div>
            <p className="text-sm font-semibold leading-snug">{field.label}</p>
            {field.hint && <p className="mt-0.5 text-xs text-muted-foreground">{field.hint}</p>}
          </div>
        </div>
        <Badge tone="muted">{responses.length}</Badge>
      </div>

      {responses.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No answers yet…</p>
      ) : isChoice ? (
        <Tally responses={responses} />
      ) : (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {responses.map((r, i) => (
            <div key={`${r.name}-${i}`} className="rounded-xl border bg-secondary/30 p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                  {r.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{r.name}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// A simple horizontal tally for dropdown-style prompts.
function Tally({ responses }: { responses: Answered[] }) {
  const counts = new Map<string, string[]>();
  responses.forEach((r) => {
    const list = counts.get(r.value) ?? [];
    list.push(r.name);
    counts.set(r.value, list);
  });
  const rows = [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
  const max = rows.reduce((m, [, names]) => Math.max(m, names.length), 1);

  return (
    <div className="mt-4 space-y-2.5">
      {rows.map(([value, names]) => (
        <div key={value}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{value}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{names.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(names.length / max) * 100}%` }} />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={names.join(", ")}>{names.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}
