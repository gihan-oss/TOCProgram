"use client";

// Admin-managed course content. With the database configured it's SHARED and
// PERMANENT (every learner on any device sees what admins build). Without it,
// it falls back to localStorage so the app still works in demo mode.

import { apiFetch } from "./api-fetch";

export type ResourceType = "Video" | "PDF" | "File" | "Note" | "Worksheet" | "Link" | "Quiz";

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: number;
}

// A worksheet is a set of prompts the learner fills in (for their own program)
// right on the page. Answers are saved per-learner.
// `kind` lets a prompt be a guided dropdown instead of free text:
//   - "area"    → pick one of the 6 Areas of Focus
//   - "outcome" → pick an outcome that belongs to the chosen Area of Focus
//                 (the options cascade from the "area" answer in the same sheet)
//   - "text"    → a normal written answer (default)
export type WorksheetFieldKind = "text" | "area" | "outcome";
export interface WorksheetField {
  id: string;
  label: string;
  hint?: string;
  long?: boolean; // multi-line answer
  required?: boolean;
  kind?: WorksheetFieldKind;
}

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string;
  fileName?: string;
  fileData?: string; // data URL fallback (no Supabase)
  body?: string; // Note text, or a worksheet's intro
  questions?: QuizQuestion[];
  fields?: WorksheetField[]; // worksheet prompts
}

// A quiz is passed at 80% (e.g. 4/5) — understanding, not gatekeeping.
export const QUIZ_PASS = 0.8;
export function quizStars(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  const pct = correct / total;
  if (pct >= 1) return 3;
  if (pct >= QUIZ_PASS) return 2;
  if (pct >= 0.5) return 1;
  return 0;
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  resources: Resource[];
}

const KEY = "toc-curriculum";
const DONE_KEY = (email: string) => `toc-progress:${email.toLowerCase()}`;

// ---------------- Modules (shared course document) ----------------

export async function loadModules(): Promise<CourseModule[]> {
  try {
    const res = await apiFetch("/api/course");
    if (res.ok) {
      const data = await res.json();
      return (data?.modules as CourseModule[]) ?? [];
    }
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CourseModule[];
  } catch {
    return [];
  }
}

export async function saveModules(modules: CourseModule[]): Promise<boolean> {
  try {
    const res = await apiFetch("/api/course", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules, updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch {}
  try {
    localStorage.setItem(KEY, JSON.stringify(modules));
    return true;
  } catch {
    return false;
  }
}

// ---------------- Per-learner progress ----------------

export async function loadDone(email: string): Promise<Set<string>> {
  try {
    const res = await apiFetch(`/api/progress?email=${encodeURIComponent(email.toLowerCase())}`);
    if (res.ok) {
      const data = await res.json();
      return new Set((data?.done as string[]) ?? []);
    }
    return new Set(); // server reachable, response not OK — don't use cache
  } catch {}
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY(email)) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export async function saveDone(email: string, done: Set<string>) {
  try {
    await apiFetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), done: [...done], updated_at: new Date().toISOString() }),
    });
    return;
  } catch {}
  try {
    localStorage.setItem(DONE_KEY(email), JSON.stringify([...done]));
  } catch {}
}

// ---------------- Per-learner gamification meta ----------------
// Best quiz scores (for stars / XP) and worksheet answers, kept alongside the
// `done` set in the same course_progress row (a `meta` jsonb column).
export interface LearnerMeta {
  scores: Record<string, { correct: number; total: number }>; // best score per quiz resource id
  worksheets: Record<string, Record<string, string>>; // answers per worksheet resource id
}
const META_KEY = (email: string) => `toc-progress-meta:${email.toLowerCase()}`;
const emptyMeta = (): LearnerMeta => ({ scores: {}, worksheets: {} });
// Coerce any stored meta into a complete LearnerMeta. Rows created by saveDone
// leave the `meta` column at its DB default `{}` (no `scores`/`worksheets`
// keys), so callers must never assume those keys exist — always normalize.
export function normalizeMeta(m: unknown): LearnerMeta {
  const o = (m && typeof m === "object" ? m : {}) as Partial<LearnerMeta>;
  return { scores: o.scores ?? {}, worksheets: o.worksheets ?? {} };
}

export async function loadMeta(email: string): Promise<LearnerMeta> {
  try {
    const res = await apiFetch(`/api/progress?email=${encodeURIComponent(email.toLowerCase())}&field=meta`);
    if (res.ok) {
      const data = await res.json();
      return normalizeMeta(data?.meta);
    }
    return emptyMeta(); // server reachable, response not OK — don't use cache
  } catch {}
  if (typeof window === "undefined") return emptyMeta();
  try {
    return normalizeMeta(JSON.parse(localStorage.getItem(META_KEY(email)) || "null"));
  } catch {
    return emptyMeta();
  }
}

export async function saveMeta(email: string, meta: LearnerMeta) {
  try {
    await apiFetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), meta, updated_at: new Date().toISOString() }),
    });
    return;
  } catch {}
  try {
    localStorage.setItem(META_KEY(email), JSON.stringify(meta));
  } catch {}
}

// ---------------- Public worksheet link (Mentimeter-style) ----------------
// A shareable link lets an enrolled participant fill a module's worksheet
// without signing in. They pick their NAME from a dropdown of enrolled members;
// answers are saved to that member's account so they appear when the person
// later signs in and opens the module.
//
// Anonymous visitors can't read `course`/`members` or write `course_progress`
// directly, so everything goes through dedicated API routes. Each participant is
// identified by an opaque token (md5 of their email) — the email itself never
// reaches the browser, and saves only ever target a real enrolled member.

// One selectable participant: a display name + the opaque token used to save.
export interface PublicParticipant { key: string; name: string }

// Read the shared course as an anonymous visitor. Falls back to loadModules()
// (which works when signed in, or in localStorage demo mode).
export async function loadModulesPublic(): Promise<CourseModule[]> {
  try {
    const res = await apiFetch("/api/public/course");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as CourseModule[];
    }
  } catch {}
  return loadModules();
}

// The enrolled-participant roster for the name dropdown. In Supabase mode each
// `key` is an opaque md5(email) token; in demo mode it's the email itself
// (read from the locally stored members allowlist to avoid a circular import).
export async function loadPublicRoster(): Promise<PublicParticipant[]> {
  try {
    const res = await apiFetch("/api/public/roster");
    if (res.ok) {
      const data = await res.json() as { token: string; name: string }[];
      return data
        .map((r) => ({ key: r.token, name: r.name }))
        .filter((r) => r.key && r.name);
    }
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  try {
    const raw = localStorage.getItem("toc-members");
    const members = raw ? (JSON.parse(raw) as { email: string; name?: string }[]) : [];
    return members
      .map((m) => ({ key: m.email.toLowerCase(), name: m.name || m.email.split("@")[0] }))
      .filter((m) => m.key)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Save worksheet answers for the chosen participant from the public link.
// `key` is the roster token (Supabase) or email (demo); `worksheets` maps
// resourceId -> answers; `doneIds` are worksheet ids to mark complete. Existing
// progress is merged (never wiped).
export async function savePublicWorksheet(
  key: string,
  worksheets: Record<string, Record<string, string>>,
  doneIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const k = key.trim();
  if (!k) return { ok: false, error: "Choose your name first" };

  try {
    const res = await apiFetch("/api/public/worksheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: k,
        worksheets,
        done: doneIds,
      }),
    });
    if (res.ok) return { ok: true };
    const err = await res.json().catch(() => ({ error: "Save failed" }));
    return { ok: false, error: err.error ?? "Save failed" };
  } catch {
    // Fall through to localStorage demo mode below
  }

  // Demo / localStorage mode — the key is the email; merge into the same keys
  // the signed-in app reads.
  try {
    const e = k.toLowerCase();
    const meta = await loadMeta(e);
    const nextMeta: LearnerMeta = { ...meta, worksheets: { ...meta.worksheets, ...worksheets } };
    await saveMeta(e, nextMeta);
    if (doneIds.length) {
      const done = await loadDone(e);
      doneIds.forEach((id) => done.add(id));
      await saveDone(e, done);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save on this device" };
  }
}

// Reset (clear) everyone's answers for the given worksheet resource ids — a
// facilitator wiping test/old responses to run fresh. Staff-only.
// Returns how many learner rows were cleared, or an error.
export async function resetWorksheetResponses(
  resourceIds: string[],
): Promise<{ ok: boolean; cleared?: number; error?: string }> {
  const ids = resourceIds.filter(Boolean);
  if (ids.length === 0) return { ok: true, cleared: 0 };
  try {
    const res = await apiFetch("/api/public/worksheet/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_ids: ids }),
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, cleared: data.cleared };
    }
    const err = await res.json().catch(() => ({ error: "Reset failed" }));
    return { ok: false, error: err.error ?? "Reset failed" };
  } catch {}
  // Demo / localStorage mode: clear this browser's own saved answers.
  try {
    if (typeof window !== "undefined") {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("toc-progress-meta:")) {
          const meta = normalizeMeta(JSON.parse(localStorage.getItem(k) || "null"));
          ids.forEach((id) => delete meta.worksheets[id]);
          localStorage.setItem(k, JSON.stringify(meta));
        }
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reset on this device" };
  }
}

// ---------------- File upload ----------------

export async function uploadFile(file: File): Promise<{ url?: string; dataUrl?: string; fileName: string; error?: string }> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch("/api/files", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      return { url: data.url, fileName: data.fileName ?? file.name };
    }
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    if (err.error) return { fileName: file.name, error: err.error };
  } catch {}
  // localStorage fallback — base64, size-limited
  if (file.size > 2_000_000) return { fileName: file.name, error: "Over 2 MB — paste a link instead." };
  const dataUrl: string = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(file);
  });
  return { dataUrl, fileName: file.name };
}

// ---------------- Helpers ----------------

export function moduleComplete(m: CourseModule, done: Set<string>) {
  return m.resources.length > 0 && m.resources.every((r) => done.has(r.id));
}

export const RESOURCE_TYPES: ResourceType[] = ["Video", "PDF", "File", "Note", "Worksheet", "Link", "Quiz"];

export const RESOURCE_ICON: Record<ResourceType, string> = {
  Video: "PlayCircle",
  PDF: "FileText",
  File: "Paperclip",
  Note: "StickyNote",
  Worksheet: "PencilRuler",
  Link: "Link",
  Quiz: "ClipboardCheck",
};

// The "Note" type stores written lessons; we surface it to admins as "Text" so
// it's obvious where to add reading material.
export const RESOURCE_LABEL: Record<ResourceType, string> = {
  Video: "Video",
  PDF: "PDF",
  File: "File",
  Note: "Text",
  Worksheet: "Worksheet",
  Link: "Link",
  Quiz: "Quiz",
};

export const RESOURCE_HELP: Record<ResourceType, string> = {
  Video: "Plays right here on the page. Paste a YouTube, Vimeo, Google Drive or Loom link — or upload a video file.",
  PDF: "Opens inline in a built-in reader (no download needed). Upload the file or paste a link.",
  File: "Slides, worksheets, images, audio… Images and media preview inline; anything else downloads. Upload or link.",
  Note: "Write text / reading material the learner reads right on the page.",
  Worksheet: "A fillable worksheet learners complete for their own program. Add prompts; their answers are saved and earn points.",
  Link: "A link to an external article or page (opens in a new tab).",
  Quiz: "A short test — add questions with multiple-choice answers. Pass at 80%, unlimited retakes.",
};

// ---------------- Inline media (no redirects) ----------------
// Everything an admin adds should be viewable *inside* the portal. These
// helpers turn a link or uploaded file into something we can render in place:
// known providers become iframe players; direct files play natively.

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|oga|flac)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;
// Office documents (slides, docs, sheets) — previewable inline via the
// Microsoft Office Online viewer, which needs a public http(s) URL.
const OFFICE_EXT = /\.(pptx?|docx?|xlsx?)(\?|#|$)/i;

// Convert a provider URL (YouTube / Vimeo / Google Drive / Loom) to an
// embeddable iframe src. Returns null if it isn't a recognised provider.
export function providerEmbed(url: string): string | null {
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  // Google Drive file preview — embeds Drive-hosted video AND PDFs in place.
  m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (m) return `https://www.loom.com/embed/${m[1]}`;
  return null;
}

export const isOfficeUrl = (u?: string) => !!u && OFFICE_EXT.test(u) && /^(https?:|\/)/.test(u);
export const isImageUrl = (u?: string) => !!u && (IMAGE_EXT.test(u) || u.startsWith("data:image/"));
export const isVideoFileUrl = (u?: string) => !!u && (VIDEO_EXT.test(u) || u.startsWith("data:video/"));
export const isAudioFileUrl = (u?: string) => !!u && (AUDIO_EXT.test(u) || u.startsWith("data:audio/"));
export const isPdfUrl = (u?: string) => !!u && (PDF_EXT.test(u) || u.startsWith("data:application/pdf"));
