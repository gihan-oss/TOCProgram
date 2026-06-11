"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { Card, CardHeader, Badge, Progress } from "@/components/ui";
import { MODULES } from "@/lib/data";
import type { LessonType } from "@/lib/types";

const LESSON_ICON: Record<LessonType, keyof typeof Icons> = {
  video: "PlayCircle",
  slides: "Presentation",
  reading: "BookOpen",
  worksheet: "FileText",
};

export default function ModuleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const module = MODULES.find((m) => m.id === id);
  if (!module) return notFound();

  const [lessons, setLessons] = useState(module.lessons);
  const [videoWatched, setVideoWatched] = useState(module.videoWatched);
  const [quizPassed, setQuizPassed] = useState(module.quizPassed);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(module.assignmentSubmitted);
  const [tab, setTab] = useState<"lessons" | "quiz" | "assignment" | "discussion">("lessons");

  const done = videoWatched && quizPassed && assignmentSubmitted;
  const nextModule = MODULES[module.index + 1];

  function toggleLesson(lessonId: string) {
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, completed: !l.completed } : l)));
  }

  return (
    <div>
      <Link href="/learning" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ArrowLeft className="h-4 w-4" /> All modules
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="muted">{module.code}</Badge>
            {done ? <Badge tone="success"><Icons.Check className="h-3 w-3" /> Complete</Badge> : <Badge tone="accent">In progress</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{module.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{module.summary}</p>
        </div>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Deliverable</p>
          {module.deliverables.map((d) => (
            <p key={d} className="text-sm font-semibold">{d}</p>
          ))}
        </Card>
      </div>

      {/* Completion checklist */}
      <Card className="mt-6 p-5">
        <p className="text-sm font-medium">Completion requirements</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Video watched", state: videoWatched, set: setVideoWatched },
            { label: "Quiz passed", state: quizPassed, set: setQuizPassed },
            { label: "Assignment submitted", state: assignmentSubmitted, set: setAssignmentSubmitted },
          ].map((req) => (
            <button
              key={req.label}
              onClick={() => req.set(!req.state)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${req.state ? "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)]" : "hover:bg-secondary"}`}
            >
              {req.state ? <Icons.CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" /> : <Icons.Circle className="h-4 w-4 text-muted-foreground" />}
              {req.label}
            </button>
          ))}
        </div>
        {done && nextModule && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-[hsl(var(--success)/0.1)] px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--success))]">
              <Icons.Unlock className="h-4 w-4" /> Module complete — {nextModule.code} unlocked
            </span>
            <Link href={`/learning/${nextModule.id}`} className="text-sm font-medium text-accent hover:underline">Continue →</Link>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b">
        {(["lessons", "quiz", "assignment", "discussion"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "lessons" && (
          <Card>
            <CardHeader title="Lessons" subtitle="Videos, slides, reading & downloadable worksheets" />
            <div className="divide-y">
              {lessons.map((l) => {
                const IconCmp = Icons[LESSON_ICON[l.type]] as Icons.LucideIcon;
                return (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <button onClick={() => toggleLesson(l.id)} aria-label="Toggle complete">
                      {l.completed ? <Icons.CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" /> : <Icons.Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <IconCmp className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{l.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{l.type} · {l.duration}</p>
                    </div>
                    {l.type === "worksheet" && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent"><Icons.Download className="h-3.5 w-3.5" /> Download</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {tab === "quiz" && (
          <Card className="p-6">
            <h3 className="font-semibold">Knowledge check</h3>
            <p className="mt-1 text-sm text-muted-foreground">{module.quizQuestions} questions · 80% to pass. Quizzes measure understanding, not completion.</p>
            <div className="mt-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Sample question</p>
              <p className="mt-1 text-sm">Which of these is an <em>outcome</em> rather than an <em>output</em>?</p>
              <div className="mt-3 space-y-2">
                {["40 teachers attended a workshop", "Teachers changed their classroom practice", "Printed 200 workbooks", "Held 6 training sessions"].map((opt, i) => (
                  <label key={opt} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                    <input type="radio" name="q" defaultChecked={i === 1} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => setQuizPassed(true)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              {quizPassed ? "Quiz passed ✓" : "Submit quiz"}
            </button>
          </Card>
        )}

        {tab === "assignment" && (
          <Card className="p-6">
            <h3 className="font-semibold">Assignment — {module.deliverables.join(", ")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Submit your implementation artifact. Your facilitator will review and approve it.</p>
            <textarea
              className="mt-4 h-32 w-full rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe or paste your deliverable, or attach a file…"
              defaultValue={assignmentSubmitted ? "Submitted: Approved Q-Zero statement and supporting rationale." : ""}
            />
            <div className="mt-3 flex items-center gap-3">
              <button onClick={() => setAssignmentSubmitted(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                {assignmentSubmitted ? "Submitted ✓" : "Submit assignment"}
              </button>
              <button className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">
                <Icons.Paperclip className="h-4 w-4" /> Attach file
              </button>
            </div>
          </Card>
        )}

        {tab === "discussion" && (
          <Card className="p-6">
            <h3 className="font-semibold">Discussion</h3>
            <div className="mt-4 space-y-4">
              {[
                { name: "Grace Mensah", text: "The if-then framing finally made the difference between outputs and outcomes click for me.", time: "2d ago" },
                { name: "Daniel Osei (Facilitator)", text: "Great example. Remember: outputs are what you produce; outcomes are what changes as a result.", time: "1d ago" },
              ].map((c) => (
                <div key={c.name} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.name}</p>
                    <span className="text-xs text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Add to the discussion…" />
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Post</button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
