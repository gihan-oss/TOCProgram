"use client";

import * as Icons from "lucide-react";
import { Card, Badge, Progress, SectionTitle } from "@/components/ui";
import { PACKAGE_ITEMS, implementationMaturityScore } from "@/lib/data";

const STATUS_FLOW = ["Not Started", "In Progress", "Submitted", "Approved"] as const;

export default function PackagePage() {
  const score = implementationMaturityScore();
  const allApproved = PACKAGE_ITEMS.every((p) => p.status === "Approved");
  const overall = PACKAGE_ITEMS.every((p) => p.status === "Approved")
    ? "Approved"
    : PACKAGE_ITEMS.some((p) => p.status === "Submitted" || p.status === "Approved")
    ? "Submitted"
    : PACKAGE_ITEMS.some((p) => p.status === "In Progress")
    ? "In Progress"
    : "Not Started";

  return (
    <div>
      <SectionTitle sub="Every participant submits Q-Zero, Causal Chain, Logframe and Measurement Plan. The portal evaluates completeness automatically.">
        Final Implementation Package
      </SectionTitle>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">Overall implementation status</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={overall === "Approved" ? "success" : overall === "Submitted" ? "accent" : overall === "In Progress" ? "warning" : "muted"} className="text-sm">{overall}</Badge>
            <span className="text-sm text-muted-foreground">· completeness {score}%</span>
          </div>
        </div>
        <button disabled={allApproved} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Icons.Send className="h-4 w-4" /> {allApproved ? "Package approved" : "Submit package for review"}
        </button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {PACKAGE_ITEMS.map((p) => {
          const stepIdx = STATUS_FLOW.indexOf(p.status);
          return (
            <Card key={p.key} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.label}</h3>
                <Badge tone={p.status === "Approved" ? "success" : p.status === "Submitted" ? "accent" : p.status === "In Progress" ? "warning" : "muted"}>{p.status}</Badge>
              </div>
              <Progress className="mt-3" value={p.completeness} tone={p.completeness >= 80 ? "success" : p.completeness >= 50 ? "accent" : "warning"} />
              <p className="mt-1 text-right text-xs text-muted-foreground">{p.completeness}% complete</p>

              <div className="mt-4 flex items-center justify-between">
                {STATUS_FLOW.map((s, i) => (
                  <div key={s} className="flex flex-1 flex-col items-center">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {i < stepIdx || (i === stepIdx && p.status === "Approved") ? <Icons.Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`mt-1 text-center text-[10px] ${i <= stepIdx ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
