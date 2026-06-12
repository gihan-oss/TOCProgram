"use client";

// Admin-managed learning content. Empty by default — facilitators/admins ADD
// modules and resources (videos, articles, worksheets…); participants only see
// what's been added. Persisted in localStorage (shared key) so it survives
// reloads; swap to Supabase later for cross-device/team sync.

export type ResourceType = "Video" | "Article" | "Slides" | "Worksheet" | "Reading";

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  resources: Resource[];
  hasQuiz: boolean;
  hasAssignment: boolean;
}

const KEY = "toc-curriculum";
const DONE_KEY = (email: string) => `toc-progress:${email.toLowerCase()}`;

export function loadModules(): CourseModule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CourseModule[]) : [];
  } catch {
    return [];
  }
}

export function saveModules(modules: CourseModule[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(modules));
  } catch {}
}

// ---- per-user completion (which resources a learner has finished) ----
export function loadDone(email: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DONE_KEY(email));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveDone(email: string, done: Set<string>) {
  try {
    localStorage.setItem(DONE_KEY(email), JSON.stringify([...done]));
  } catch {}
}

export const RESOURCE_TYPES: ResourceType[] = ["Video", "Article", "Slides", "Worksheet", "Reading"];

export const RESOURCE_ICON: Record<ResourceType, string> = {
  Video: "PlayCircle",
  Article: "Newspaper",
  Slides: "Presentation",
  Worksheet: "FileText",
  Reading: "BookOpen",
};
