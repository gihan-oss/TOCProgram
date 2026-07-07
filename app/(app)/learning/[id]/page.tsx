"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { Card, Badge, Button, EmptyHint } from "@/components/ui";
import { Confetti } from "@/components/confetti";
import { QuizGame } from "@/components/quiz-game";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { CLIENT } from "@/lib/mas";
import { effectiveModules } from "@/lib/starter-course";
import {
  loadModules, saveModules, loadDone, saveDone, loadMeta, saveMeta, uploadFile, moduleComplete,
  RESOURCE_TYPES, RESOURCE_ICON, RESOURCE_LABEL, RESOURCE_HELP,
  providerEmbed, isImageUrl, isVideoFileUrl, isAudioFileUrl, isPdfUrl, isOfficeUrl,
  type CourseModule, type Resource, type ResourceType, type QuizQuestion, type WorksheetField, type LearnerMeta,
} from "@/lib/content";

// Consecutive Text sections render as one flowing article; everything else
// (video, PDF, worksheet, quiz, file) stays its own card.
type Block = { kind: "article"; notes: Resource[] } | { kind: "single"; r: Resource };
function groupBlocks(resources: Resource[]): Block[] {
  const blocks: Block[] = [];
  for (const r of resources) {
    const last = blocks[blocks.length - 1];
    if (r.type === "Note") {
      if (last && last.kind === "article") last.notes.push(r);
      else blocks.push({ kind: "article", notes: [r] });
    } else {
      blocks.push({ kind: "single", r });
    }
  }
  return blocks;
}

export default function ModuleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "facilitator";
  const toast = useToast();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<LearnerMeta>({ scores: {}, worksheets: {} });
  const [loaded, setLoaded] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    (async () => {
      setModules(effectiveModules(await loadModules()));
      if (user) {
        setDone(await loadDone(user.email));
        setMeta(await loadMeta(user.email));
      }
      setLoaded(true);
    })();
  }, [user?.email]);

  const module = modules.find((m) => m.id === id);
  if (loaded && !module) return notFound();
  if (!module) return null;
  const moduleIndex = modules.findIndex((m) => m.id === id);
  const nextModule = moduleIndex >= 0 ? modules[moduleIndex + 1] : undefined;
  const moduleDone = moduleComplete(module, done);

  function celebrate() {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1900);
  }

  async function persist(next: CourseModule) {
    const all = modules.map((m) => (m.id === next.id ? next : m));
    setModules(all);
    const ok = await saveModules(all);
    if (!ok) {
      toast("Couldn't save — please try again.", "error");
      setModules(await loadModules());
    }
  }

  async function addResource(r: Resource) {
    await persist({ ...module!, resources: [...module!.resources, r] });
  }
  async function removeResource(rid: string) {
    await persist({ ...module!, resources: module!.resources.filter((r) => r.id !== rid) });
    toast("Removed");
  }
  // Reorder an item within the module — admins can put the PDF first, move a
  // worksheet up, etc. Swaps the item with its neighbour in the saved order.
  async function moveResource(rid: string, dir: -1 | 1) {
    const arr = [...module!.resources];
    const i = arr.findIndex((r) => r.id === rid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    await persist({ ...module!, resources: arr });
  }
  function setComplete(rid: string, value: boolean) {
    setDone((prev) => {
      const next = new Set(prev);
      value ? next.add(rid) : next.delete(rid);
      if (user) void saveDone(user.email, next);
      return next;
    });
  }
  function completeMany(ids: string[]) {
    setDone((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      if (user) void saveDone(user.email, next);
      return next;
    });
    toast("Marked as read ✓");
  }
  function recordScore(rid: string, correct: number, total: number) {
    setMeta((prev) => {
      const cur = prev.scores[rid];
      if (cur && cur.total === total && cur.correct >= correct) return prev; // keep best
      const next = { ...prev, scores: { ...prev.scores, [rid]: { correct, total } } };
      if (user) void saveMeta(user.email, next);
      return next;
    });
  }
  function recordWorksheet(rid: string, answers: Record<string, string>) {
    setMeta((prev) => {
      const next = { ...prev, worksheets: { ...prev.worksheets, [rid]: answers } };
      if (user) void saveMeta(user.email, next);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      {confetti && <Confetti />}
      <Link href="/learning" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ArrowLeft className="h-4 w-4" /> {canEdit ? "Course builder" : "My learning"}
      </Link>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {CLIENT.tocTitle}{moduleIndex >= 0 ? ` · Module ${moduleIndex + 1}` : ""}
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{module.title}</h1>
          {module.summary && <p className="mt-1 text-sm text-muted-foreground">{module.summary}</p>}
        </div>
        {canEdit && <Badge tone="accent"><Icons.Pencil className="h-3 w-3" /> Editing</Badge>}
      </div>

      {module.resources.length === 0 ? (
        <div className="mt-6"><EmptyHint>{canEdit ? "Nothing here yet. Add a video, PDF, file, text, worksheet or test below — it all lives right here on the page." : "No content in this module yet."}</EmptyHint></div>
      ) : (
        <div className="mt-6 space-y-4">
          {groupBlocks(module.resources).map((b, bi) =>
            b.kind === "article" ? (
              <ArticleBlock
                key={`article-${bi}`}
                notes={b.notes}
                doneSet={done}
                canEdit={canEdit}
                resources={module.resources}
                onReadAll={() => completeMany(b.notes.map((n) => n.id))}
                onRemove={removeResource}
                onMove={moveResource}
              />
            ) : (
              (() => {
                const idx = module.resources.findIndex((x) => x.id === b.r.id);
                return (
                  <ResourceCard
                    key={b.r.id}
                    r={b.r}
                    canEdit={canEdit}
                    done={done.has(b.r.id)}
                    best={meta.scores[b.r.id]}
                    answers={meta.worksheets[b.r.id] ?? {}}
                    canUp={idx > 0}
                    canDown={idx >= 0 && idx < module.resources.length - 1}
                    onComplete={(v) => setComplete(b.r.id, v)}
                    onScore={(c, t, passed) => { recordScore(b.r.id, c, t); if (passed) { if (!done.has(b.r.id)) celebrate(); setComplete(b.r.id, true); } }}
                    onWorksheet={(answers, complete) => { recordWorksheet(b.r.id, answers); if (complete) { if (!done.has(b.r.id)) celebrate(); setComplete(b.r.id, true); } }}
                    onRemove={() => removeResource(b.r.id)}
                    onMove={(dir) => moveResource(b.r.id, dir)}
                  />
                );
              })()
            ),
          )}
        </div>
      )}

      {canEdit && <AddContent onAdd={addResource} />}

      {!canEdit && module.resources.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Link href="/learning" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Icons.ArrowLeft className="h-4 w-4" /> All modules
          </Link>
          {nextModule ? (
            moduleDone ? (
              <Link href={`/learning/${nextModule.id}`}><Button size="sm">Next module <Icons.ArrowRight className="h-4 w-4" /></Button></Link>
            ) : (
              <Button size="sm" disabled title="Finish everything above to continue">Next module <Icons.ArrowRight className="h-4 w-4" /></Button>
            )
          ) : moduleDone ? (
            <Link href="/learning"><Button size="sm">Finish <Icons.Check className="h-4 w-4" /></Button></Link>
          ) : (
            <Button size="sm" disabled title="Finish everything above">Finish <Icons.Check className="h-4 w-4" /></Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Reading: one flowing article ----------------
function ArticleBlock({ notes, doneSet, canEdit, resources, onReadAll, onRemove, onMove }: {
  notes: Resource[];
  doneSet: Set<string>;
  canEdit: boolean;
  resources: Resource[];
  onReadAll: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const allRead = notes.every((n) => doneSet.has(n.id));
  return (
    <Card className="px-6 py-7 sm:px-10 sm:py-9">
      <article className="mx-auto max-w-2xl">
        {notes.map((n, i) => {
          const idx = resources.findIndex((x) => x.id === n.id);
          return (
          <section key={n.id} className={i > 0 ? "mt-10" : ""}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{n.title}</h2>
              {canEdit && (
                <div className="mt-1 flex items-center">
                  <button onClick={() => onMove(n.id, -1)} disabled={idx <= 0} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Move up" title="Move up">
                    <Icons.ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => onMove(n.id, 1)} disabled={idx < 0 || idx >= resources.length - 1} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Move down" title="Move down">
                    <Icons.ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => onRemove(n.id)} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove section">
                    <Icons.Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {n.body && <Prose text={n.body} />}
          </section>
          );
        })}
        {!canEdit && (
          <div className="mt-8 flex items-center gap-2 border-t pt-5">
            {allRead ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--success))]"><Icons.CheckCircle2 className="h-4 w-4" /> Read</span>
            ) : (
              <Button size="sm" onClick={onReadAll}><Icons.Check className="h-4 w-4" /> Mark as read</Button>
            )}
          </div>
        )}
      </article>
    </Card>
  );
}

// ---------------- Resource display ----------------
function ResourceCard({ r, canEdit, done, best, answers, canUp, canDown, onComplete, onScore, onWorksheet, onRemove, onMove }: {
  r: Resource;
  canEdit: boolean;
  done: boolean;
  best?: { correct: number; total: number };
  answers: Record<string, string>;
  canUp: boolean;
  canDown: boolean;
  onComplete: (v: boolean) => void;
  onScore: (correct: number, total: number, passed: boolean) => void;
  onWorksheet: (answers: Record<string, string>, complete: boolean) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[RESOURCE_ICON[r.type]] ?? Icons.File;
  const isMedia = r.type === "Video" || r.type === "PDF" || r.type === "File" || r.type === "Link";
  // Worksheets are collapsible and start collapsed — click the title to open.
  const collapsible = r.type === "Worksheet";
  const [open, setOpen] = useState(!collapsible);
  const wsFields = collapsible ? (r.fields ?? []) : [];
  const wsFilled = wsFields.filter((f) => (answers[f.id] ?? "").trim()).length;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            {collapsible ? (
              <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Icons.ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                <span className="truncate text-sm font-medium">{r.title}</span>
                {done && <Badge tone="success"><Icons.Check className="h-3 w-3" /> Done</Badge>}
                {!open && wsFields.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">{wsFilled}/{wsFields.length} answered</span>}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className={r.type === "Note" ? "text-base font-semibold tracking-tight" : "text-sm font-medium"}>{r.title}</p>
                {done && <Badge tone="success"><Icons.Check className="h-3 w-3" /> Done</Badge>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge tone="muted">{RESOURCE_LABEL[r.type]}</Badge>
              {canEdit && (
                <div className="flex items-center">
                  <button onClick={() => onMove(-1)} disabled={!canUp} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Move up" title="Move up">
                    <Icons.ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => onMove(1)} disabled={!canDown} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Move down" title="Move down">
                    <Icons.ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={onRemove} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove">
                    <Icons.Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {open && (r.type === "Quiz" && r.questions ? (
            <QuizGame questions={r.questions} best={best} onResult={onScore} />
          ) : r.type === "Worksheet" ? (
            <WorksheetPlayer r={r} answers={answers} done={done} onSave={onWorksheet} />
          ) : (
            <MediaBody r={r} />
          ))}

          {/* Passive items (video, PDF, file, link) are completed with a button,
              not a checkbox. Quizzes/worksheets complete via their own actions. */}
          {!canEdit && isMedia && (
            <div className="mt-3">
              {done ? (
                <Button size="sm" variant="outline" onClick={() => onComplete(false)}><Icons.Check className="h-4 w-4" /> Completed</Button>
              ) : (
                <Button size="sm" onClick={() => onComplete(true)}>Mark complete <Icons.ArrowRight className="h-4 w-4" /></Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Renders media INLINE so learners never get redirected away.
function MediaBody({ r }: { r: Resource }) {
  const src = r.fileData || r.url || "";

  if (r.type === "Note") {
    return r.body ? <Prose text={r.body} /> : null;
  }

  if (r.type === "Link") {
    return src ? (
      <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
        Open link {r.fileName ? `(${r.fileName})` : ""} <Icons.ExternalLink className="h-3.5 w-3.5" />
      </a>
    ) : <NoSource />;
  }

  if (r.type === "Video") {
    const embed = r.url ? providerEmbed(r.url) : null;
    if (embed) {
      return (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border">
          <iframe src={embed} className="h-full w-full" title={r.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      );
    }
    if (src) return <video src={src} controls preload="metadata" className="mt-3 w-full rounded-lg border bg-black" />;
    return <NoSource />;
  }

  if (r.type === "PDF") {
    const embed = r.url ? providerEmbed(r.url) : null;
    const frameSrc = embed || src;
    if (!frameSrc) return <NoSource />;
    return (
      <div className="mt-3 space-y-2">
        <div className="h-[70vh] max-h-[640px] w-full overflow-hidden rounded-lg border">
          <iframe src={frameSrc} className="h-full w-full" title={r.title} />
        </div>
        {src && <DownloadLink href={src} fileName={r.fileName} label="Open in a new tab" />}
      </div>
    );
  }

  if (r.type === "File") {
    if (isImageUrl(src)) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={r.title} loading="lazy" className="mt-3 max-h-[640px] w-auto max-w-full rounded-lg border" />;
    }
    if (isVideoFileUrl(src)) return <video src={src} controls preload="metadata" className="mt-3 w-full rounded-lg border bg-black" />;
    if (isAudioFileUrl(src)) return <audio src={src} controls className="mt-3 w-full" />;
    if (isPdfUrl(src)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="h-[70vh] max-h-[640px] w-full overflow-hidden rounded-lg border"><iframe src={src} className="h-full w-full" title={r.title} /></div>
          <DownloadLink href={src} fileName={r.fileName} label="Open in a new tab" />
        </div>
      );
    }
    if (isOfficeUrl(src)) return <OfficePreview src={src} title={r.title} fileName={r.fileName} />;
    return src ? <DownloadLink href={src} fileName={r.fileName} label="Open / download" /> : <NoSource />;
  }

  return null;
}

function DownloadLink({ href, fileName, label }: { href: string; fileName?: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" download={fileName} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
      {label} {fileName ? `(${fileName})` : ""} <Icons.ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function NoSource() {
  return <p className="mt-2 text-sm text-muted-foreground">No file or link added yet.</p>;
}

// Previews Office files (PowerPoint / Word / Excel — e.g. the module
// slidedecks) INLINE via the Microsoft Office Online viewer, so learners read
// them right on the page instead of downloading. The viewer needs a public
// absolute URL, so we resolve a site-relative path against the current origin.
function OfficePreview({ src, title, fileName }: { src: string; title: string; fileName?: string }) {
  const [abs, setAbs] = useState<string | null>(null);
  useEffect(() => {
    setAbs(/^https?:\/\//i.test(src) ? src : `${window.location.origin}${src}`);
  }, [src]);

  if (!abs) {
    return <div className="mt-3 flex h-24 items-center justify-center rounded-lg border"><Icons.Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(abs)}`;
  return (
    <div className="mt-3 space-y-2">
      <div className="h-[70vh] max-h-[640px] w-full overflow-hidden rounded-lg border bg-muted">
        <iframe src={viewer} className="h-full w-full" title={title} />
      </div>
      <DownloadLink href={abs} fileName={fileName} label="Open / download" />
    </div>
  );
}

// Renders written content as a readable article: section headings, bullet and
// numbered lists, and comfortable paragraph spacing — not a flat gray block.
function Prose({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const { ordered, items } = list;
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-accent">
          {items.map((t, i) => <li key={i} className="pl-1">{t}</li>)}
        </ol>
      ) : (
        <ul key={blocks.length} className="my-3 space-y-1.5">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2.5"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /><span>{t}</span></li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  lines.forEach((raw) => {
    const t = raw.trim();
    if (!t) { flush(); return; }
    if (/^[•\-*]\s+/.test(t)) {
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; }
      list.items.push(t.replace(/^[•\-*]\s+/, ""));
      return;
    }
    if (/^\d+\.\s+/.test(t)) {
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; }
      list.items.push(t.replace(/^\d+\.\s+/, ""));
      return;
    }
    flush();
    const letters = t.replace(/[^a-zA-Z]/g, "");
    const isUpper = letters.length > 1 && letters === letters.toUpperCase();
    const isLabel = t.endsWith(":") && t.length < 72 && !/\.\s/.test(t);
    if (isUpper || isLabel) {
      blocks.push(<h4 key={blocks.length} className="mt-5 text-xs font-bold uppercase tracking-wider text-accent">{t.replace(/:$/, "")}</h4>);
    } else {
      blocks.push(<p key={blocks.length} className="my-2.5">{t}</p>);
    }
  });
  flush();

  return <div className="mt-2 text-[15px] leading-7 text-foreground/90 [&>*:first-child]:mt-0">{blocks}</div>;
}

// ---------------- Gamified worksheet ----------------
function WorksheetPlayer({ r, answers, done, onSave }: {
  r: Resource;
  answers: Record<string, string>;
  done: boolean;
  onSave: (answers: Record<string, string>, complete: boolean) => void;
}) {
  const toast = useToast();
  const fields = r.fields ?? [];
  const [vals, setVals] = useState<Record<string, string>>(answers);

  // Prompts are shown one at a time on a horizontal track you swipe/scroll
  // through — so even a long worksheet feels short and easy, not a wall of text.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const atStart = active <= 0;
  const atEnd = active >= fields.length - 1;
  function goTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(fields.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActive(clamped);
  }
  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  const required = fields.filter((f) => f.required);
  const filled = fields.filter((f) => (vals[f.id] ?? "").trim()).length;
  const pct = fields.length ? Math.round((filled / fields.length) * 100) : 0;
  const canComplete = fields.length > 0 && required.every((f) => (vals[f.id] ?? "").trim()) && filled > 0;

  function set(id: string, v: string) { setVals((p) => ({ ...p, [id]: v })); }

  // Open a clean, Amal & Company–branded printable sheet. Filled answers print
  // as text; blank prompts print as ruled lines so it works as a handout too.
  function printWorksheet() {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const brand = "#5b4bd6", accent = "#0ea5a4", soft = "#6b7280";
    const rowsHtml = fields.map((f, i) => {
      const val = (vals[f.id] ?? "").trim();
      const answer = val
        ? `<div class="ans">${esc(val).replace(/\n/g, "<br>")}</div>`
        : `<div class="blank"></div>`;
      return `<div class="field"><div class="label">${i + 1}. ${esc(f.label)}${f.required ? ' <span style="color:#dc2626">*</span>' : ""}</div>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}${answer}</div>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
      @page{margin:18mm}*{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;font-size:14px}
      .head{border-bottom:3px solid ${brand};padding-bottom:12px;margin-bottom:18px}
      .row{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;color:${brand}}
      .brand img{height:32px}
      .client{font-size:11px;color:${soft};text-transform:uppercase;letter-spacing:.06em;font-weight:700;text-align:right}
      h1{font-size:20px;margin:14px 0 4px}
      .intro{font-size:13px;color:${soft};margin:0;white-space:pre-wrap}
      .field{margin:15px 0;page-break-inside:avoid}
      .label{font-weight:700}.hint{font-size:12px;color:${soft};margin-top:2px}
      .ans{margin-top:6px;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;min-height:26px;white-space:pre-wrap}
      .blank{margin-top:10px;height:84px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,#cbd5e1 27px,#cbd5e1 28px)}
      .foot{margin-top:26px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:${soft};display:flex;justify-content:space-between}
    </style></head><body>
      <div class="head"><div class="row">
        <div class="brand"><img src="${origin}/logo.png" alt="" onerror="this.style.display='none'">Amal &amp; Company</div>
        <div class="client">${esc(CLIENT.tocTitle)}</div>
      </div><h1>${esc(r.title)}</h1>${r.body ? `<p class="intro">${esc(r.body)}</p>` : ""}</div>
      ${rowsHtml}
      <div class="foot"><span>Amal &amp; Company · ${esc(CLIENT.tocTitle)}</span><span>${new Date().toLocaleDateString()}</span></div>
      <scr` + `ipt>window.onload=function(){setTimeout(function(){window.print()},200)}</scr` + `ipt>
    </body></html>`;
    const w = window.open("", "_blank", "width=880,height=1100");
    if (!w) { toast("Allow pop-ups to print the worksheet", "error"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* sheet header */}
      <div className="flex items-center justify-between gap-2 border-b border-dashed bg-secondary/40 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
          <Icons.PencilRuler className="h-3.5 w-3.5" /> Worksheet · for your program
        </span>
        <span className="text-xs font-medium text-muted-foreground">{filled}/{fields.length} answered</span>
      </div>

      {r.body && <p className="whitespace-pre-wrap border-b bg-secondary/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground sm:px-6">{r.body}</p>}

      {/* One prompt per slide — swipe or use the arrows to move left / right. */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fields.map((f, i) => (
          <div key={f.id} className="w-full shrink-0 snap-center px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-xl">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt {i + 1} of {fields.length}</span>
                {(vals[f.id] ?? "").trim() && <Icons.CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
              </div>
              <label className="mt-3 block text-base font-semibold leading-snug">{f.label}{f.required && <span className="text-[hsl(var(--danger))]"> *</span>}</label>
              {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
              {f.long ? (
                <textarea
                  value={vals[f.id] ?? ""}
                  onChange={(e) => set(f.id, e.target.value)}
                  rows={5}
                  placeholder="Write your answer…"
                  className="worksheet-lines mt-3 block w-full resize-y rounded-lg border bg-background px-3 text-sm leading-[30px] outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              ) : (
                <input
                  value={vals[f.id] ?? ""}
                  onChange={(e) => set(f.id, e.target.value)}
                  placeholder="Write your answer…"
                  className="mt-3 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* pager: prev / dots / next */}
      {fields.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t bg-secondary/20 px-4 py-2.5 sm:px-6">
          <button onClick={() => goTo(active - 1)} disabled={atStart} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/70 hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent">
            <Icons.ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {fields.map((f, i) => (
              <button
                key={f.id}
                onClick={() => goTo(i)}
                aria-label={`Go to prompt ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-accent" : (vals[f.id] ?? "").trim() ? "w-2 bg-accent/50" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <button onClick={() => goTo(active + 1)} disabled={atEnd} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/70 hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent">
            Next <Icons.ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* footer actions */}
      <div className="flex flex-wrap items-center gap-3 border-t bg-secondary/30 px-4 py-3 sm:px-6">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
          {!canComplete && required.length > 0 && <span className="hidden text-xs text-muted-foreground sm:inline">Fill the required prompts</span>}
        </div>
        <Button size="sm" variant="outline" onClick={printWorksheet}><Icons.Printer className="h-4 w-4" /> Print</Button>
        <Button size="sm" variant="outline" onClick={() => { onSave(vals, false); toast("Progress saved"); }}>Save progress</Button>
        <Button size="sm" disabled={!canComplete} onClick={() => onSave(vals, true)}>
          <Icons.Sparkles className="h-4 w-4" /> {done ? "Save changes" : "Submit worksheet"}
        </Button>
      </div>
    </div>
  );
}

// ---------------- Add content (admins) ----------------
function AddContent({ onAdd }: { onAdd: (r: Resource) => void }) {
  const toast = useToast();
  const [type, setType] = useState<ResourceType>("Video");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState("");
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([{ prompt: "", options: ["", ""], answer: 0 }]);
  const [fields, setFields] = useState<WorksheetField[]>([{ id: `wf-${Date.now()}`, label: "", long: true, required: true }]);

  function reset() {
    setTitle(""); setUrl(""); setBody(""); setFileName(""); setFileData("");
    setQuestions([{ prompt: "", options: ["", ""], answer: 0 }]);
    setFields([{ id: `wf-${Date.now()}`, label: "", long: true, required: true }]);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    const res = await uploadFile(f);
    setUploading(false);
    if (res.error) { toast(res.error, "error"); return; }
    setUrl(res.url || "");
    setFileData(res.dataUrl || "");
    setFileName(res.fileName);
    if (!title) setTitle(res.fileName);
    toast("File uploaded");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast("Give it a title", "error"); return; }
    const id = `r-${Date.now()}`;
    if (type === "Note") {
      if (!body.trim()) { toast("Write some text first", "error"); return; }
      onAdd({ id, type, title, body });
    } else if (type === "Worksheet") {
      const clean = fields.filter((f) => f.label.trim()).map((f) => ({ id: f.id, label: f.label.trim(), hint: f.hint?.trim() || undefined, long: f.long, required: f.required }));
      if (clean.length === 0) { toast("Add at least one prompt", "error"); return; }
      onAdd({ id, type, title, body: body.trim() || undefined, fields: clean });
    } else if (type === "Quiz") {
      const clean = questions.filter((q) => q.prompt.trim() && q.options.filter((o) => o.trim()).length >= 2);
      if (clean.length === 0) { toast("Add at least one question with two options", "error"); return; }
      onAdd({ id, type, title, questions: clean });
    } else {
      if (!url.trim() && !fileData) { toast(type === "Link" ? "Paste a link first" : "Add a link or upload a file", "error"); return; }
      onAdd({ id, type, title, url: url.trim() || undefined, fileName: fileName || undefined, fileData: fileData || undefined });
    }
    toast(`${RESOURCE_LABEL[type]} added`);
    reset();
  }

  const accept = type === "Video" ? "video/*" : type === "PDF" ? "application/pdf" : undefined;

  return (
    <Card className="mt-5 p-5">
      <p className="mb-1 text-sm font-semibold">Add content</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {RESOURCE_TYPES.map((t) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[RESOURCE_ICON[t]] ?? Icons.File;
          return (
            <button key={t} type="button" onClick={() => setType(t)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${type === t ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>
              <Icon className="h-3.5 w-3.5" /> {RESOURCE_LABEL[t]}
            </button>
          );
        })}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{RESOURCE_HELP[type]}</p>

      <form onSubmit={submit} className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${RESOURCE_LABEL[type]} title`} className="modal-input" />

        {type === "Link" && (
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the link (URL)" className="modal-input" />
        )}

        {type === "Video" && (
          <div className="space-y-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a YouTube, Vimeo, Google Drive or Loom link…" className="modal-input" />
            <UploadRow label="upload a video file" accept={accept} uploading={uploading} fileName={fileName} onFile={onFile} />
          </div>
        )}

        {(type === "PDF" || type === "File") && (
          <div className="space-y-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link…" className="modal-input" />
            <UploadRow label="upload a file" accept={accept} uploading={uploading} fileName={fileName} onFile={onFile} />
          </div>
        )}

        {type === "Note" && (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the text / reading material…" className="modal-input h-40" />
        )}

        {type === "Worksheet" && (
          <div className="space-y-3 rounded-lg border p-3">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Intro / instructions (optional)" className="modal-input h-20" />
            <p className="text-xs font-medium text-muted-foreground">Prompts the learner fills in:</p>
            {fields.map((f, fi) => (
              <div key={f.id} className="space-y-2 rounded-md border p-2.5">
                <input value={f.label} onChange={(e) => setFields((fs) => fs.map((x, i) => i === fi ? { ...x, label: e.target.value } : x))} placeholder={`Prompt ${fi + 1} (e.g. "Draft your IF statement")`} className="modal-input" />
                <input value={f.hint ?? ""} onChange={(e) => setFields((fs) => fs.map((x, i) => i === fi ? { ...x, hint: e.target.value } : x))} placeholder="Hint (optional)" className="modal-input" />
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={!!f.long} onChange={(e) => setFields((fs) => fs.map((x, i) => i === fi ? { ...x, long: e.target.checked } : x))} /> Long answer</label>
                  <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={!!f.required} onChange={(e) => setFields((fs) => fs.map((x, i) => i === fi ? { ...x, required: e.target.checked } : x))} /> Required</label>
                  {fields.length > 1 && <button type="button" onClick={() => setFields((fs) => fs.filter((_, i) => i !== fi))} className="text-[hsl(var(--danger))] hover:underline">Remove</button>}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setFields((fs) => [...fs, { id: `wf-${Date.now()}-${fs.length}`, label: "", long: true, required: true }])} className="text-xs font-medium text-accent hover:underline">+ add prompt</button>
          </div>
        )}

        {type === "Quiz" && (
          <div className="space-y-3 rounded-lg border p-3">
            {questions.map((q, qi) => (
              <div key={qi} className="space-y-2">
                <input value={q.prompt} onChange={(e) => setQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, prompt: e.target.value } : x))} placeholder={`Question ${qi + 1}`} className="modal-input" />
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`ans${qi}`} checked={q.answer === oi} onChange={() => setQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, answer: oi } : x))} title="Correct answer" />
                    <input value={opt} onChange={(e) => setQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, options: x.options.map((o, k) => k === oi ? e.target.value : o) } : x))} placeholder={`Option ${oi + 1}`} className="modal-input" />
                  </div>
                ))}
                <button type="button" onClick={() => setQuestions((qs) => qs.map((x, i) => i === qi ? { ...x, options: [...x.options, ""] } : x))} className="text-xs font-medium text-accent hover:underline">+ option</button>
              </div>
            ))}
            <button type="button" onClick={() => setQuestions((qs) => [...qs, { prompt: "", options: ["", ""], answer: 0 }])} className="text-xs font-medium text-accent hover:underline">+ add question</button>
            <p className="text-[11px] text-muted-foreground">Select the radio next to the correct option for each question. Learners pass at 80%, with unlimited retakes.</p>
          </div>
        )}

        <Button size="sm" type="submit"><Icons.Plus className="h-4 w-4" /> Add {RESOURCE_LABEL[type].toLowerCase()}</Button>
      </form>
    </Card>
  );
}

function UploadRow({ label, accept, uploading, fileName, onFile }: { label: string; accept?: string; uploading: boolean; fileName: string; onFile: (f: File | undefined) => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>or</span>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 font-medium hover:bg-secondary">
        {uploading ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Upload className="h-3.5 w-3.5" />} {uploading ? "Uploading…" : label}
        <input type="file" className="hidden" accept={accept} disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {fileName && <span className="text-foreground">{fileName}</span>}
    </div>
  );
}
