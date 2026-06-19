"use client";

import { getSupabaseBrowserClient } from "./supabase";

// Admin-managed course content. With Supabase configured it's SHARED and
// PERMANENT (every learner on any device sees what admins build, files live in
// Supabase Storage). Without it, it falls back to localStorage so the app still
// works in demo mode.

export type ResourceType = "Video" | "PDF" | "File" | "Note" | "Link" | "Quiz";

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: number;
}

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string;
  fileName?: string;
  fileData?: string; // data URL fallback (no Supabase)
  body?: string;
  questions?: QuizQuestion[];
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
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("course").select("modules").eq("id", "default").maybeSingle();
    return ((data?.modules as CourseModule[]) ?? []);
  }
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CourseModule[];
  } catch {
    return [];
  }
}

export async function saveModules(modules: CourseModule[]): Promise<boolean> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { error } = await sb.from("course").upsert({ id: "default", modules, updated_at: new Date().toISOString() });
    return !error;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(modules));
    return true;
  } catch {
    return false;
  }
}

// ---------------- Per-learner progress ----------------

export async function loadDone(email: string): Promise<Set<string>> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("course_progress").select("done").eq("email", email.toLowerCase()).maybeSingle();
    return new Set((data?.done as string[]) ?? []);
  }
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY(email)) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export async function saveDone(email: string, done: Set<string>) {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("course_progress").upsert({ email: email.toLowerCase(), done: [...done], updated_at: new Date().toISOString() });
    return;
  }
  try {
    localStorage.setItem(DONE_KEY(email), JSON.stringify([...done]));
  } catch {}
}

// ---------------- File upload ----------------

export async function uploadFile(file: File): Promise<{ url?: string; dataUrl?: string; fileName: string; error?: string }> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${Date.now()}-${safe}`;
    const { error } = await sb.storage.from("course-files").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) return { fileName: file.name, error: error.message };
    const { data } = sb.storage.from("course-files").getPublicUrl(path);
    return { url: data.publicUrl, fileName: file.name };
  }
  // localStorage fallback — base64, size-limited
  if (file.size > 2_000_000) return { fileName: file.name, error: "Over 2 MB — connect Supabase Storage or paste a link." };
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

export const RESOURCE_TYPES: ResourceType[] = ["Video", "PDF", "File", "Note", "Link", "Quiz"];

export const RESOURCE_ICON: Record<ResourceType, string> = {
  Video: "PlayCircle",
  PDF: "FileText",
  File: "Paperclip",
  Note: "StickyNote",
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
  Link: "Link",
  Quiz: "Quiz",
};

export const RESOURCE_HELP: Record<ResourceType, string> = {
  Video: "Plays right here on the page. Paste a YouTube, Vimeo, Google Drive or Loom link — or upload a video file.",
  PDF: "Opens inline in a built-in reader (no download needed). Upload the file or paste a link.",
  File: "Slides, worksheets, images, audio… Images and media preview inline; anything else downloads. Upload or link.",
  Note: "Write text / reading material the learner reads right on the page.",
  Link: "A link to an external article or page (opens in a new tab).",
  Quiz: "A short test — add questions with multiple-choice answers.",
};

// ---------------- Inline media (no redirects) ----------------
// Everything an admin adds should be viewable *inside* the portal. These
// helpers turn a link or uploaded file into something we can render in place:
// known providers become iframe players; direct files play natively.

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|oga|flac)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;

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

export const isImageUrl = (u?: string) => !!u && (IMAGE_EXT.test(u) || u.startsWith("data:image/"));
export const isVideoFileUrl = (u?: string) => !!u && (VIDEO_EXT.test(u) || u.startsWith("data:video/"));
export const isAudioFileUrl = (u?: string) => !!u && (AUDIO_EXT.test(u) || u.startsWith("data:audio/"));
export const isPdfUrl = (u?: string) => !!u && (PDF_EXT.test(u) || u.startsWith("data:application/pdf"));
