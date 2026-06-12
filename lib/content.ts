"use client";

// Admin-managed course content. Empty by default. Admins/facilitators build
// modules and add content to them — Videos, PDFs, Files, Notes, Links and
// Tests. Participants see the modules one at a time, unlocking the next as they
// finish the current one. Stored in localStorage; swap to Supabase for sharing.

export type ResourceType = "Video" | "PDF" | "File" | "Note" | "Link" | "Quiz";

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: number; // index of the correct option
}

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string; // Video / Link / PDF / File (external link)
  fileName?: string; // uploaded file name
  fileData?: string; // data URL for a small uploaded file
  body?: string; // Note text
  questions?: QuizQuestion[]; // Quiz
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  resources: Resource[];
}

const KEY = "toc-curriculum";
const DONE_KEY = (email: string) => `toc-progress:${email.toLowerCase()}`;

export function loadModules(): CourseModule[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CourseModule[];
  } catch {
    return [];
  }
}

// Returns false if the save failed (e.g. storage quota exceeded by a big file).
export function saveModules(modules: CourseModule[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(modules));
    return true;
  } catch {
    return false;
  }
}

export function loadDone(email: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY(email)) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function saveDone(email: string, done: Set<string>) {
  try {
    localStorage.setItem(DONE_KEY(email), JSON.stringify([...done]));
  } catch {}
}

// A module is complete when it has resources and the learner has finished them all.
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
