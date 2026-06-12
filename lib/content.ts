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

export const RESOURCE_HELP: Record<ResourceType, string> = {
  Video: "A video lesson — paste a YouTube, Vimeo or Drive link.",
  PDF: "A PDF — upload the file or paste a link.",
  File: "Any file (slides, worksheet, image…) — upload or link.",
  Note: "A written note or instructions the learner reads in place.",
  Link: "A link to an external article or page.",
  Quiz: "A short test — add questions with multiple-choice answers.",
};
