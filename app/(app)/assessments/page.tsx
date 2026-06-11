"use client";

import { Card, CardHeader, Stat, Progress, SectionTitle, Badge } from "@/components/ui";
import { PARTICIPANTS } from "@/lib/data";

export default function AssessmentsPage() {
  const scored = PARTICIPANTS.filter((p) => p.postScore > 0);
  const avgPre = Math.round(scored.reduce((s, p) => s + p.preScore, 0) / scored.length);
  const avgPost = Math.round(scored.reduce((s, p) => s + p.postScore, 0) / scored.length);
  const improvement = Math.round(((avgPost - avgPre) / avgPre) * 100);

  return (
    <div>
      <SectionTitle sub="Registration · knowledge assessment · confidence assessment — pre/post scoring with automatic improvement">
        Pre &amp; Post Assessments
      </SectionTitle>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Average pre-score" value={avgPre} hint="Knowledge baseline" />
        <Stat label="Average post-score" value={avgPost} hint="Post-program knowledge" tone="success" />
        <Stat label="Improvement" value={`+${improvement}%`} hint="Learning growth" tone="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Learning Growth Dashboard" subtitle="Pre vs. post knowledge per participant" />
          <div className="space-y-4 p-5">
            {scored.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[hsl(var(--success))]">+{p.postScore - p.preScore} pts</span>
                </div>
                <div className="relative h-6 w-full overflow-hidden rounded-md bg-muted">
                  <div className="absolute inset-y-0 left-0 bg-muted-foreground/30" style={{ width: `${p.preScore}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-accent/70" style={{ width: `${p.postScore}%` }} />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[11px] font-medium">
                    <span>pre {p.preScore}</span>
                    <span>post {p.postScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Assessment forms" subtitle="Configured for this program" />
          <div className="divide-y">
            {[
              { name: "Registration form", desc: "Organization, role, baseline context", status: "Complete" },
              { name: "Knowledge pre-assessment", desc: "20 questions · TOC fundamentals", status: "Complete" },
              { name: "Confidence pre-assessment", desc: "Self-rated capability (1–5)", status: "Complete" },
              { name: "Knowledge post-assessment", desc: "20 questions · administered at close", status: "Open" },
              { name: "Confidence post-assessment", desc: "Self-rated capability (1–5)", status: "Open" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between gap-2 px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
                <Badge tone={f.status === "Complete" ? "success" : "accent"}>{f.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
