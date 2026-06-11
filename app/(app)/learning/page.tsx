"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Progress, SectionTitle } from "@/components/ui";
import { MODULES } from "@/lib/data";

function moduleComplete(i: number) {
  const m = MODULES[i];
  return m.videoWatched && m.quizPassed && m.assignmentSubmitted;
}

export default function LearningPage() {
  return (
    <div>
      <SectionTitle sub="Cohort-based delivery · sequential unlocking · completion requires video watched, quiz passed and assignment submitted">
        Learning Modules
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-2">
        {MODULES.map((m) => {
          const done = moduleComplete(m.index);
          const locked = m.index > 0 && !moduleComplete(m.index - 1);
          const lessonsDone = m.lessons.filter((l) => l.completed).length;
          const progress = Math.round(
            ((m.videoWatched ? 1 : 0) + (m.quizPassed ? 1 : 0) + (m.assignmentSubmitted ? 1 : 0)) / 3 * 100,
          );

          const inner = (
            <Card className={`h-full p-5 transition-shadow ${locked ? "opacity-60" : "hover:shadow-md"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone="muted">{m.code}</Badge>
                  {done && <Badge tone="success"><Icons.Check className="h-3 w-3" /> Complete</Badge>}
                  {locked && <Badge tone="muted"><Icons.Lock className="h-3 w-3" /> Locked</Badge>}
                  {!done && !locked && <Badge tone="accent">In progress</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{m.lessons.length} lessons · {m.quizQuestions} Q quiz</span>
              </div>

              <h3 className="mt-3 text-lg font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.topics.map((t) => (
                  <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{t}</span>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{lessonsDone}/{m.lessons.length} lessons · deliverable: {m.deliverables.join(", ")}</span>
                  <span>{progress}%</span>
                </div>
                <Progress className="mt-1.5" value={progress} tone={done ? "success" : "accent"} />
              </div>

              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className={`flex items-center gap-1 ${m.videoWatched ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                  {m.videoWatched ? <Icons.CheckCircle2 className="h-3.5 w-3.5" /> : <Icons.Circle className="h-3.5 w-3.5" />} Video
                </span>
                <span className={`flex items-center gap-1 ${m.quizPassed ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                  {m.quizPassed ? <Icons.CheckCircle2 className="h-3.5 w-3.5" /> : <Icons.Circle className="h-3.5 w-3.5" />} Quiz
                </span>
                <span className={`flex items-center gap-1 ${m.assignmentSubmitted ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                  {m.assignmentSubmitted ? <Icons.CheckCircle2 className="h-3.5 w-3.5" /> : <Icons.Circle className="h-3.5 w-3.5" />} Assignment
                </span>
              </div>
            </Card>
          );

          return locked ? (
            <div key={m.id} className="cursor-not-allowed" title="Complete the previous module to unlock">{inner}</div>
          ) : (
            <Link key={m.id} href={`/learning/${m.id}`}>{inner}</Link>
          );
        })}
      </div>
    </div>
  );
}
