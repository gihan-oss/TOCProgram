"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { loadModules, saveModules, loadDone, moduleComplete, type CourseModule } from "@/lib/content";

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
    (async () => {
      setModules(await loadModules());
      if (user) setDone(await loadDone(user.email));
    })();
  }, [user?.email]);

  async function persist(next: CourseModule[]) {
    setModules(next);
    const ok = await saveModules(next);
    if (!ok) { toast("Couldn't save — please try again.", "error"); setModules(await loadModules()); }
  }
  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await persist([...modules, { id: `m-${Date.now()}`, title: title.trim(), summary: summary.trim(), resources: [] }]);
    setTitle(""); setSummary(""); setAdding(false);
    toast("Module created — open it to add content");
  }
  async function removeModule(id: string) {
    await persist(modules.filter((m) => m.id !== id));
    toast("Module removed");
  }
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[i], next[j]] = [next[j], next[i]];
    await persist(next);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub={canEdit ? "Build the course: create modules, then add videos, PDFs, files, notes and tests. Learners see them one at a time." : "Work through each module. The next one unlocks when you finish the current one."}>
          {canEdit ? "Course Builder" : "My Learning"}
        </SectionTitle>
        {canEdit && <Button size="sm" onClick={() => setAdding((v) => !v)}><Icons.Plus className="h-4 w-4" /> Add module</Button>}
      </div>

      {canEdit && adding && (
        <Card className="mb-4 p-5">
          <form onSubmit={addModule} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title (e.g. Module 1 — Getting Started)" className="modal-input" autoFocus />
            <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description (optional)" className="modal-input" />
            <div className="flex gap-2"><Button size="sm" type="submit">Create module</Button><Button size="sm" variant="outline" type="button" onClick={() => setAdding(false)}>Cancel</Button></div>
          </form>
        </Card>
      )}

      {modules.length === 0 ? (
        <EmptyHint>{canEdit ? "No modules yet. Click “Add module” to create your first one, then open it to add videos, PDFs, files, notes and tests." : "No modules have been published yet — check back soon."}</EmptyHint>
      ) : (
        <div className="space-y-3">
          {modules.map((m, i) => {
            const total = m.resources.length;
            const completed = m.resources.filter((r) => done.has(r.id)).length;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            // gradual unlock for learners
            const locked = !canEdit && i > 0 && !moduleComplete(modules[i - 1], done);
            const complete = moduleComplete(m, done);

            const inner = (
              <Card className={`p-5 ${locked ? "opacity-60" : "transition-shadow hover:shadow-md"}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${complete ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : locked ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"}`}>
                    {complete ? <Icons.Check className="h-5 w-5" /> : locked ? <Icons.Lock className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{m.title}</h3>
                      {complete && <Badge tone="success">Complete</Badge>}
                      {locked && <Badge tone="muted"><Icons.Lock className="h-3 w-3" /> Locked</Badge>}
                    </div>
                    {m.summary && <p className="mt-0.5 text-sm text-muted-foreground">{m.summary}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {total} item{total !== 1 ? "s" : ""}{!canEdit && total > 0 ? ` · ${completed}/${total} done` : ""}
                      {locked && i > 0 ? ` · finish “${modules[i - 1].title}” to unlock` : ""}
                    </p>
                    {!canEdit && total > 0 && (
                      <div className="mt-1.5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Move up"><Icons.ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => move(i, 1)} disabled={i === modules.length - 1} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Move down"><Icons.ChevronDown className="h-4 w-4" /></button>
                      <button onClick={() => removeModule(m.id)} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove"><Icons.Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                  {!locked && <Icons.ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />}
                </div>
              </Card>
            );

            return locked ? (
              <div key={m.id} title="Finish the previous module to unlock">{inner}</div>
            ) : (
              <Link key={m.id} href={`/learning/${m.id}`}>{inner}</Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
