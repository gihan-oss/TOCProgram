"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { Card, Badge, Button, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import {
  loadModules, saveModules, loadDone, saveDone,
  RESOURCE_TYPES, RESOURCE_ICON, type CourseModule, type Resource, type ResourceType,
} from "@/lib/content";

export default function ModuleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "facilitator";
  const toast = useToast();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // add-resource form
  const [type, setType] = useState<ResourceType>("Video");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    setModules(loadModules());
    if (user) setDone(loadDone(user.email));
    setLoaded(true);
  }, [user?.email]);

  const module = modules.find((m) => m.id === id);
  if (loaded && !module) return notFound();
  if (!module) return null;

  function update(next: CourseModule) {
    const all = modules.map((m) => (m.id === next.id ? next : m));
    setModules(all);
    saveModules(all);
  }

  function addResource(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast("Give the resource a title", "error"); return; }
    const res: Resource = { id: `r-${Date.now()}`, type, title: title.trim(), url: url.trim() };
    update({ ...module!, resources: [...module!.resources, res] });
    setTitle(""); setUrl("");
    toast(`${type} added`);
  }

  function removeResource(rid: string) {
    update({ ...module!, resources: module!.resources.filter((r) => r.id !== rid) });
    toast("Resource removed");
  }

  function toggleDone(rid: string) {
    const next = new Set(done);
    next.has(rid) ? next.delete(rid) : next.add(rid);
    setDone(next);
    if (user) saveDone(user.email, next);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/learning" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ArrowLeft className="h-4 w-4" /> All modules
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{module.title}</h1>
          {module.summary && <p className="mt-1 text-sm text-muted-foreground">{module.summary}</p>}
        </div>
        {canEdit && <Badge tone="accent"><Icons.Pencil className="h-3 w-3" /> Editing as {user?.role}</Badge>}
      </div>

      {/* Resources */}
      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resources</h2>
      {module.resources.length === 0 ? (
        <EmptyHint>{canEdit ? "No resources yet. Add a video, article, slides, worksheet or reading below." : "No resources in this module yet."}</EmptyHint>
      ) : (
        <Card className="divide-y">
          {module.resources.map((r) => {
            const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[RESOURCE_ICON[r.type]] ?? Icons.File;
            const isDone = done.has(r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <button onClick={() => toggleDone(r.id)} aria-label="Toggle complete">
                  {isDone ? <Icons.CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" /> : <Icons.Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                <Cmp className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.type}</p>
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                    Open <Icons.ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {canEdit && (
                  <button onClick={() => removeResource(r.id)} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove">
                    <Icons.Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* Add resource (facilitators/admins only) */}
      {canEdit && (
        <Card className="mt-4 p-5">
          <p className="mb-3 text-sm font-semibold">Add a resource</p>
          <form onSubmit={addResource} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {RESOURCE_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${type === t ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>{t}</button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${type} title`} className="modal-input" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link / URL (YouTube, Drive, article…)" className="modal-input" />
            <Button size="sm" type="submit"><Icons.Plus className="h-4 w-4" /> Add {type.toLowerCase()}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
