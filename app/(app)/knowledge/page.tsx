"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Badge } from "@/components/ui";
import { KB_ARTICLES } from "@/lib/data";

const CATEGORIES = [
  { id: "toc", name: "Theory of Change", icon: "Workflow", desc: "Templates, examples and how-to guides for building causal logic.", count: 18, tone: "text-accent bg-accent/10" },
  { id: "logframe", name: "Logframes", icon: "Table2", desc: "Vertical & horizontal logic, indicators and verification.", count: 12, tone: "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)]" },
  { id: "measurement", name: "Measurement & M&E", icon: "Ruler", desc: "SMART indicators, baselines, targets and data quality.", count: 21, tone: "text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.12)]" },
  { id: "assumptions", name: "Assumptions & Risk", icon: "ShieldAlert", desc: "Validating assumptions and running revision workflows.", count: 9, tone: "text-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.12)]" },
  { id: "strategy", name: "Nonprofit Strategy", icon: "Compass", desc: "Best practices for impact-driven organizations.", count: 15, tone: "text-primary bg-primary/10" },
  { id: "webinars", name: "Recorded Webinars", icon: "PlayCircle", desc: "On-demand sessions and masterclasses.", count: 7, tone: "text-accent bg-accent/10" },
];

const FAQS = [
  { q: "What's the difference between an output and an outcome?", a: "An output is what your activities directly produce (e.g. '200 parents trained'). An outcome is the change that results (e.g. 'parents support reading at home'). Outputs you control; outcomes you influence." },
  { q: "How do I know if my Theory of Change is complete?", a: "The portal validates it for you: no orphan activities, no unsupported outcomes, and every connection to an outcome carries an assumption. When the TOC Builder shows 'All clear', your causal logic is structurally sound." },
  { q: "When should I mark an assumption as Failed?", a: "When evidence shows the condition no longer holds. A failed assumption automatically raises an alert and starts a revision workflow, because the outcomes that depend on it are now at risk." },
  { q: "What makes an indicator SMART?", a: "Specific, Measurable, Achievable, Relevant and Time-bound. In practice: a clear name, a baseline, a target, a target date, a frequency, and a defined means of verification." },
  { q: "How is the Implementation Maturity Score calculated?", a: "It's the average completeness (0–100) of your five core artifacts: Q-Zero, Causal Chain, Theory of Change, Logframe and Measurement Plan." },
];

export default function KnowledgePage() {
  const [q, setQ] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("q");
    if (param) setQ(param);
  }, []);

  const results = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return KB_ARTICLES.filter((a) => `${a.title} ${a.summary} ${a.category}`.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="-mx-4 -mt-6 lg:-mx-8">
      {/* KB hero with live search */}
      <section className="relative overflow-hidden border-b bg-primary px-6 py-14 text-center text-primary-foreground">
        <div className="mesh absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How can we help?</h1>
          <p className="mt-2 text-primary-foreground/80">Search the nonprofit strategy library — guides, templates, webinars and answers.</p>
          <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-xl">
            <Icons.Search className="ml-2 h-5 w-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for articles, e.g. “outcomes vs outputs”"
              className="w-full bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-primary-foreground/70">
            <span>Popular:</span>
            {["Logframe", "SMART indicators", "Assumptions", "Q-Zero"].map((t) => (
              <button key={t} onClick={() => setQ(t)} className="rounded-full bg-white/15 px-2.5 py-0.5 hover:bg-white/25">{t}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {/* Live search results */}
        {q && (
          <div className="mb-8">
            <p className="mb-3 text-sm text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""} for “{q}”</p>
            <div className="divide-y rounded-2xl border bg-card">
              {results.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-4 hover:bg-secondary">
                  <Icons.FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.category} · {a.readingTime}</p>
                  </div>
                </div>
              ))}
              {results.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No articles found. Try another term.</p>}
            </div>
          </div>
        )}

        {/* Category grid */}
        {!q && (
          <>
            <h2 className="mb-4 text-lg font-bold tracking-tight">Browse by category</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => {
                const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[c.icon] ?? Icons.BookOpen;
                return (
                  <button key={c.id} className="group rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.tone}`}>
                      <Cmp className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold">{c.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs font-medium text-accent">
                      {c.count} articles <Icons.ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Popular articles + FAQ accordion */}
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-lg font-bold tracking-tight">Popular articles</h2>
                <div className="divide-y rounded-2xl border bg-card">
                  {KB_ARTICLES.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-4 hover:bg-secondary">
                      <div className="flex items-start gap-3">
                        <Icons.FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge tone="muted" className="mt-1">{a.category}</Badge>
                        </div>
                      </div>
                      <Icons.ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-bold tracking-tight">Frequently asked</h2>
                <div className="space-y-2">
                  {FAQS.map((f, i) => {
                    const open = openFaq === i;
                    return (
                      <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                        <button onClick={() => setOpenFaq(open ? null : i)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                          <span className="text-sm font-medium">{f.q}</span>
                          <Icons.ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                        {open && <p className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
