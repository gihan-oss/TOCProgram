"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Stat } from "@/components/ui";
import { COHORTS, PARTICIPANTS } from "@/lib/data";
import { ADMIN_EMAILS, LEARNER_EMAILS } from "@/lib/access";

const TOOLS = [
  { href: "/admin/access", icon: "UserPlus", title: "People & Access", desc: "Invite users, set admin or learner access, remove people.", tone: "bg-accent/12 text-accent" },
  { href: "/cohorts", icon: "Users", title: "Cohorts & Facilitators", desc: "Create cohorts, assign facilitators, monitor readiness.", tone: "bg-primary/10 text-primary" },
  { href: "/reports", icon: "FileBarChart", title: "Reporting", desc: "Organization, cohort and leadership reports.", tone: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" },
  { href: "/learning", icon: "BookMarked", title: "Programs & Modules", desc: "Manage training programs and module content.", tone: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]" },
  { href: "/knowledge", icon: "Library", title: "Knowledge Base", desc: "Curate templates, guides and webinars.", tone: "bg-accent/12 text-accent" },
  { href: "/impact", icon: "TrendingUp", title: "Impact Oversight", desc: "Portfolio impact and implementation rates.", tone: "bg-primary/10 text-primary" },
];

export default function AdminConsole() {
  const users = ADMIN_EMAILS.length + LEARNER_EMAILS.length;
  return (
    <div>
      {/* Admin banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icons.ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-sm text-muted-foreground">Administrator access · manage organizations, cohorts, people and programs</p>
          </div>
        </div>
        <Link href="/admin/access" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Icons.UserPlus className="h-4 w-4" /> Invite people
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Organizations" value="4" hint="Active partner orgs" />
        <Stat label="Cohorts" value={COHORTS.length} hint="57 participants" />
        <Stat label="People with access" value={users} hint="Admins + learners" />
        <Stat label="Facilitators" value="2" hint="Assigned across cohorts" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Management</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[t.icon] ?? Icons.Square;
          return (
            <Link key={t.href} href={t.href}>
              <Card className="group h-full p-5 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.tone}`}>
                  <Cmp className="h-5 w-5" />
                </div>
                <h3 className="mt-4 flex items-center gap-1 font-semibold">{t.title}<Icons.ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border bg-card p-5">
        <p className="flex items-center gap-2 font-semibold"><Icons.Info className="h-4 w-4 text-accent" /> Why access is restricted</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a nonprofit implementation platform, not an open course. Learners follow a guided, step-by-step journey and only see what's relevant to their current stage. Admins control who's in, what they can reach, and how progress is reported — so the data stays trustworthy.
        </p>
      </div>
    </div>
  );
}
