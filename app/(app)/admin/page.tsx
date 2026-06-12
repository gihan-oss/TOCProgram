"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui";
import { useApp } from "@/components/providers";
import { loadModules, type CourseModule } from "@/lib/content";

export default function AdminConsole() {
  const { setRole } = useApp();
  const [modules, setModules] = useState<CourseModule[]>([]);

  useEffect(() => { loadModules().then(setModules); }, []);

  const hasModule = modules.length > 0;
  const hasContent = modules.some((m) => m.resources.length > 0);

  const steps = [
    { done: hasModule, title: "Create your first module", desc: "Modules are the chapters of your course. Start with one.", action: <Link href="/learning" className="font-medium text-accent hover:underline">Open Course Builder →</Link> },
    { done: hasContent, title: "Add content to it", desc: "Open a module and add a Video, PDF, File, Note or Test. Mix and match.", action: <Link href="/learning" className="font-medium text-accent hover:underline">Add content →</Link> },
    { done: false, title: "Invite your people", desc: "Add admins and learners by email. Only invited people can sign in.", action: <Link href="/admin/access" className="font-medium text-accent hover:underline">Invite people →</Link> },
    { done: false, title: "Preview as a participant", desc: "See exactly what a learner sees — modules unlock one at a time as they finish each.", action: <button onClick={() => setRole("participant")} className="font-medium text-accent hover:underline">View as participant →</button> },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icons.ShieldCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Admin Home</h1>
          <p className="text-sm text-muted-foreground">Build the course, invite people, and preview what learners see.</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-6 p-5">
        <p className="flex items-center gap-2 font-semibold"><Icons.Info className="h-4 w-4 text-accent" /> How it works</p>
        <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li><span className="font-medium text-foreground">1. You build modules</span> and fill them with videos, PDFs, files, notes and tests.</li>
          <li><span className="font-medium text-foreground">2. Learners work through them one at a time</span> — the next module unlocks when they finish the current one.</li>
          <li><span className="font-medium text-foreground">3. You preview anytime</span> with “View as participant” to see exactly what they see.</li>
        </ol>
      </Card>

      {/* Getting started checklist */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Getting started</h2>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <Card key={i} className="flex items-start gap-3 p-4">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-[hsl(var(--success))] text-white" : "bg-muted text-muted-foreground"}`}>
              {s.done ? <Icons.Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
              <div className="mt-1.5 text-sm">{s.action}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/learning", icon: "BookMarked", label: "Course Builder" },
          { href: "/admin/access", icon: "UserPlus", label: "People & Access" },
          { href: "/assistant", icon: "Sparkles", label: "AI Coach" },
        ].map((q) => {
          const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[q.icon] ?? Icons.Square;
          return (
            <Link key={q.href} href={q.href}>
              <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/12 text-accent"><Cmp className="h-4 w-4" /></span>
                <span className="text-sm font-medium">{q.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
