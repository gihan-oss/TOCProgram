"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { KB_ARTICLES } from "@/lib/data";

export default function KnowledgePage() {
  const [q, setQ] = useState("");
  const categories = Array.from(new Set(KB_ARTICLES.map((a) => a.category)));
  const [cat, setCat] = useState<string | "All">("All");

  const shown = useMemo(
    () => KB_ARTICLES.filter((a) => (cat === "All" || a.category === cat) && (!q || `${a.title} ${a.summary}`.toLowerCase().includes(q.toLowerCase()))),
    [q, cat],
  );

  return (
    <div>
      <SectionTitle sub="A searchable nonprofit strategy library: TOC templates, program examples, best practices, webinars and guides">
        Knowledge Base
      </SectionTitle>

      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <Icons.Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the strategy library…" className="w-full bg-transparent text-sm outline-none" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(["All", ...categories]).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => (
          <Card key={a.id} className="flex flex-col p-5 transition-shadow hover:shadow-md">
            <Badge tone="accent" className="self-start">{a.category}</Badge>
            <h3 className="mt-3 font-semibold leading-snug">{a.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{a.summary}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Icons.Clock className="h-3.5 w-3.5" /> {a.readingTime}</span>
              <span className="flex items-center gap-1 font-medium text-accent">Open <Icons.ArrowRight className="h-3.5 w-3.5" /></span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
