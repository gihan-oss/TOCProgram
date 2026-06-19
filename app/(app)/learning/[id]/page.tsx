"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { Card, Badge, Button, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { CLIENT } from "@/lib/mas";
import {
  loadModules, saveModules, loadDone, saveDone, uploadFile,
  RESOURCE_TYPES, RESOURCE_ICON, RESOURCE_LABEL, RESOURCE_HELP,
  providerEmbed, isImageUrl, isVideoFileUrl, isAudioFileUrl, isPdfUrl,
  type CourseModule, type Resource, type ResourceType, type QuizQuestion,
} from "@/lib/content";

export default function ModuleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "facilitator";
  const toast = useToast();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setModules(await loadModules());
      if (user) setDone(await loadDone(user.email));
      setLoaded(true);
    })();
  }, [user?.email]);

  const module = modules.find((m) => m.id === id);
  if (loaded && !module) return notFound();
  if (!module) return null;
  const moduleIndex = modules.findIndex((m) => m.id === id);

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
  function setComplete(rid: string, value: boolean) {
    const next = new Set(done);
    value ? next.add(rid) : next.delete(rid);
    setDone(next);
    if (user) void saveDone(user.email, next);
  }

  return (
    <div className="mx-auto max-w-3xl">
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

      {/* Content list */}
      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Content</h2>
      {module.resources.length === 0 ? (
        <EmptyHint>{canEdit ? "Nothing here yet. Add a video, PDF, file, text or test below — it all plays right here on the page." : "No content in this module yet."}</EmptyHint>
      ) : (
        <div className="space-y-3">
          {module.resources.map((r) => (
            <ResourceCard key={r.id} r={r} canEdit={canEdit} done={done.has(r.id)} onComplete={(v) => setComplete(r.id, v)} onRemove={() => removeResource(r.id)} />
          ))}
        </div>
      )}

      {canEdit && <AddContent onAdd={addResource} />}
    </div>
  );
}

// ---------------- Resource display ----------------
function ResourceCard({ r, canEdit, done, onComplete, onRemove }: { r: Resource; canEdit: boolean; done: boolean; onComplete: (v: boolean) => void; onRemove: () => void }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[RESOURCE_ICON[r.type]] ?? Icons.File;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <button onClick={() => onComplete(!done)} aria-label="Toggle complete" className="mt-0.5">
          {done ? <Icons.CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" /> : <Icons.Circle className="h-5 w-5 text-muted-foreground" />}
        </button>
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{r.title}</p>
            <div className="flex items-center gap-2">
              <Badge tone="muted">{RESOURCE_LABEL[r.type]}</Badge>
              {canEdit && (
                <button onClick={onRemove} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove">
                  <Icons.Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <ResourceBody r={r} onComplete={onComplete} />
        </div>
      </div>
    </Card>
  );
}

// Renders every resource INLINE so learners never get redirected away.
function ResourceBody({ r, onComplete }: { r: Resource; onComplete: (v: boolean) => void }) {
  const src = r.fileData || r.url || "";

  if (r.type === "Note") {
    return r.body ? <p className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-sm leading-relaxed">{r.body}</p> : null;
  }

  if (r.type === "Quiz" && r.questions) {
    return <QuizPlayer questions={r.questions} onPass={() => onComplete(true)} />;
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
    const embed = r.url ? providerEmbed(r.url) : null; // e.g. a Google Drive PDF
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

  // File — preview images / video / audio / pdf inline; otherwise offer download.
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

function QuizPlayer({ questions, onPass }: { questions: QuizQuestion[]; onPass: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  const passed = submitted && correct === questions.length;

  useEffect(() => {
    if (passed) onPass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  return (
    <div className="mt-3 space-y-3 rounded-lg border p-3">
      {questions.map((q, i) => (
        <div key={i}>
          <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
          <div className="mt-1.5 space-y-1">
            {q.options.map((opt, j) => {
              const chosen = answers[i] === j;
              const reveal = submitted;
              const isAns = q.answer === j;
              return (
                <label key={j} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${reveal && isAns ? "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)]" : reveal && chosen ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.08)]" : chosen ? "border-accent" : ""}`}>
                  <input type="radio" name={`q${i}`} checked={chosen} onChange={() => setAnswers((a) => ({ ...a, [i]: j }))} disabled={submitted} /> {opt}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <Button size="sm" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}>Submit answers</Button>
      ) : (
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${passed ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}`}>{correct} / {questions.length} correct</span>
          {passed ? <span className="text-sm text-[hsl(var(--success))]">Passed ✓</span> : <Button size="sm" variant="outline" onClick={() => { setSubmitted(false); setAnswers({}); }}>Try again</Button>}
        </div>
      )}
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

  function reset() {
    setTitle(""); setUrl(""); setBody(""); setFileName(""); setFileData("");
    setQuestions([{ prompt: "", options: ["", ""], answer: 0 }]);
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
            <button key={t} type="button" onClick={() => { setType(t); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${type === t ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>
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
            <p className="text-[11px] text-muted-foreground">Select the radio next to the correct option for each question.</p>
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
