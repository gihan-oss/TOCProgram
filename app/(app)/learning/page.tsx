"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { loadModules, saveModules, loadDone, type CourseModule } from "@/lib/content";

export default function LearningPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "facilitator";
  const toast = useToast();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    setModules(loadModules());
    if (user) setDone(loadDone(user.email));
  }, [user?.email]);

  function persist(next: CourseModule[]) {
    setModules(next);
    saveModules(next);
  }

  function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    persist([...modules, { id: `m-${Date.now()}`, title: title.trim(), summary: summary.trim(), resources: [], hasQuiz: false, hasAssignment: false }]);
    setTitle(""); setSummary(""); setAdding(false);
    toast("Module added");
  }

  function removeModule(id: string) {
    persist(modules.filter((m) => m.id !== id));
    toast("Module removed");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub={canEdit ? "Add the modules, videos, articles and worksheets your program needs — nothing is pre-filled." : "Your learning modules, as published by your facilitator."}>
          Learning Modules
        </SectionTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Icons.Plus className="h-4 w-4" /> Add module
          </Button>
        )}
      </div>

      {canEdit && adding && (
        <Card className="mb-4 p-5">
          <form onSubmit={addModule} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title (e.g. Module 0 — Question Zero)" className="modal-input" autoFocus />
            <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description (optional)" className="modal-input" />
            <div className="flex gap-2">
              <Button size="sm" type="submit">Add module</Button>
              <Button size="sm" variant="outline" type="button" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {modules.length === 0 ? (
        <EmptyHint>
          {canEdit
            ? "No modules yet. Click “Add module” to create your first one, then add videos, articles and worksheets inside it."
            : "No modules have been published yet. Check back soon."}
        </EmptyHint>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modules.map((m, i) => {
            const total = m.resources.length;
            const completed = m.resources.filter((r) => done.has(r.id)).length;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            return (
              <Card key={m.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge tone="muted">Module {i + 1}</Badge>
                  {canEdit && (
                    <button onClick={() => removeModule(m.id)} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove module">
                      <Icons.Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-semibold">{m.title}</h3>
                {m.summary && <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>}
                <p className="mt-3 text-xs text-muted-foreground">{total} resource{total !== 1 ? "s" : ""}{total > 0 ? ` · ${completed}/${total} done` : ""}</p>
                {total > 0 && (
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <Link href={`/learning/${m.id}`} className="mt-4">
                  <Button size="sm" variant="outline" className="w-full">{canEdit ? "Manage module" : "Open module"} <Icons.ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
