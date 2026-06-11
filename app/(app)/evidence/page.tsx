"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { EVIDENCE } from "@/lib/data";
import type { EvidenceKind } from "@/lib/types";

const KIND_ICON: Record<EvidenceKind, keyof typeof Icons> = {
  PDF: "FileText",
  DOCX: "FileType",
  XLSX: "Sheet",
  Image: "Image",
  URL: "Link",
};

export default function EvidencePage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<EvidenceKind | "All">("All");
  const allTags = Array.from(new Set(EVIDENCE.flatMap((e) => e.tags)));
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const shown = useMemo(() => {
    return EVIDENCE.filter((e) => {
      if (kind !== "All" && e.kind !== kind) return false;
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (q && !`${e.name} ${e.linkedTo} ${e.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, kind, activeTag]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evidence Repository</h1>
          <p className="text-sm text-muted-foreground">Upload PDF, DOCX, XLSX, images and URLs · link to outcomes, outputs, indicators and assumptions</p>
        </div>
        <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icons.Upload className="h-4 w-4" /> Upload evidence
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <Icons.Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search evidence…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind | "All")} className="rounded-lg border bg-card px-3 py-2 text-sm outline-none">
          {["All", "PDF", "DOCX", "XLSX", "Image", "URL"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTag(activeTag === t ? null : t)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${activeTag === t ? "bg-accent text-accent-foreground" : "border bg-card hover:bg-secondary"}`}
          >
            #{t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => {
          const IconCmp = Icons[KIND_ICON[e.kind]] as Icons.LucideIcon;
          return (
            <Card key={e.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <IconCmp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.uploadedBy} · {e.date}</p>
                </div>
                <Badge tone="muted">{e.kind}</Badge>
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Icons.Link2 className="h-3.5 w-3.5" /> {e.linkedTo}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {e.tags.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">#{t}</span>)}
              </div>
            </Card>
          );
        })}
        {shown.length === 0 && <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No evidence matches your filters.</p>}
      </div>
    </div>
  );
}
