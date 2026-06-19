"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { loadModules, loadDone, loadMeta, QUIZ_PASS, quizStars, type CourseModule, type LearnerMeta } from "@/lib/content";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Icons.Star key={n} className={`h-4 w-4 ${n <= value ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground/40"}`} />
      ))}
    </span>
  );
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [meta, setMeta] = useState<LearnerMeta>({ scores: {}, worksheets: {} });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setModules(await loadModules());
      if (user) {
        await loadDone(user.email); // ensure progress row exists
        setMeta(await loadMeta(user.email));
      }
      setLoaded(true);
    })();
  }, [user?.email]);

  // Every knowledge check across the course, with the learner's best result.
  const checks = modules.flatMap((m, mi) =>
    m.resources
      .filter((r) => r.type === "Quiz" && r.questions?.length)
      .map((r) => {
        const best = meta.scores[r.id];
        const passed = !!best && best.total > 0 && best.correct / best.total >= QUIZ_PASS;
        return { moduleId: m.id, moduleIndex: mi, moduleTitle: m.title, r, best, passed };
      }),
  );

  const attempted = checks.filter((c) => c.best && c.best.total > 0);
  const passedCount = checks.filter((c) => c.passed).length;
  const avg = attempted.length
    ? Math.round((attempted.reduce((s, c) => s + (c.best!.correct / c.best!.total) * 100, 0) / attempted.length))
    : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle sub="Each module ends with a short knowledge check. Pass at 80% — unlimited retakes, because the goal is understanding.">
        My Knowledge Checks
      </SectionTitle>

      {!loaded ? (
        <div className="flex justify-center py-10"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : checks.length === 0 ? (
        <EmptyHint>No knowledge checks yet. They appear here as your facilitator publishes each module.</EmptyHint>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Checks passed</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{passedCount}<span className="text-lg text-muted-foreground">/{checks.length}</span></p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Average score</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{attempted.length ? `${avg}%` : "—"}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Attempted</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{attempted.length}<span className="text-lg text-muted-foreground">/{checks.length}</span></p>
            </Card>
          </div>

          <div className="space-y-3">
            {checks.map((c) => (
              <Link key={c.r.id} href={`/learning/${c.moduleId}`}>
                <Card className="flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Module {c.moduleIndex + 1}</p>
                    <p className="truncate text-sm font-medium">{c.r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.r.questions!.length} questions</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {c.best && c.best.total > 0 ? (
                      <>
                        <Stars value={quizStars(c.best.correct, c.best.total)} />
                        <span className="text-sm font-semibold">{c.best.correct}/{c.best.total}</span>
                        <Badge tone={c.passed ? "success" : "warning"}>{c.passed ? "Passed" : "Keep trying"}</Badge>
                      </>
                    ) : (
                      <Badge tone="muted">Not started</Badge>
                    )}
                    <Icons.ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
