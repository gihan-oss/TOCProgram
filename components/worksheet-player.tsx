"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { CLIENT, AREAS_OF_FOCUS } from "@/lib/mas";
import type { Resource } from "@/lib/content";

// ---------------- Gamified worksheet ----------------
// The fillable worksheet a learner completes for their own program. Prompts show
// one at a time on a swipeable track; answers auto-save via `onSave`. Used both
// inside a module (saving to the signed-in learner) and on the public share link
// (saving to whoever entered their name + email).
export function WorksheetPlayer({ r, answers, done, onSave }: {
  r: Resource;
  answers: Record<string, string>;
  done: boolean;
  onSave: (answers: Record<string, string>, complete: boolean) => void;
}) {
  const toast = useToast();
  const fields = r.fields ?? [];
  const [vals, setVals] = useState<Record<string, string>>(answers);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  // Prompts are shown one at a time on a horizontal track you swipe/scroll
  // through — so even a long worksheet feels short and easy, not a wall of text.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const atStart = active <= 0;
  const atEnd = active >= fields.length - 1;
  function goTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(fields.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActive(clamped);
  }
  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  // For cascading dropdowns: the chosen Area of Focus (from the sheet's "area"
  // field) drives which outcomes an "outcome" field offers.
  const areaField = fields.find((f) => f.kind === "area");
  const chosenArea = areaField ? (vals[areaField.id] ?? "") : "";
  const outcomeOptions = AREAS_OF_FOCUS.find((a) => a.name === chosenArea)?.outcomes ?? [];

  const required = fields.filter((f) => f.required);
  const filled = fields.filter((f) => (vals[f.id] ?? "").trim()).length;
  const pct = fields.length ? Math.round((filled / fields.length) * 100) : 0;
  const canComplete = fields.length > 0 && required.every((f) => (vals[f.id] ?? "").trim()) && filled > 0;

  function set(id: string, v: string) { setVals((p) => ({ ...p, [id]: v })); }

  // Auto-save: answers persist quietly a moment after the learner stops typing —
  // no Save/Submit button to hunt for. Once the required prompts are filled it
  // also marks the worksheet complete (for progress), which the parent handles.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const t = setTimeout(() => onSave(vals, canComplete), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals, canComplete]);

  // Open a clean, Amal & Company–branded printable sheet. Filled answers print
  // as text; blank prompts print as ruled lines so it works as a handout too.
  function printWorksheet() {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const brand = "#5b4bd6", accent = "#0ea5a4", soft = "#6b7280";
    const rowsHtml = fields.map((f, i) => {
      const val = (vals[f.id] ?? "").trim();
      const answer = val
        ? `<div class="ans">${esc(val).replace(/\n/g, "<br>")}</div>`
        : `<div class="blank"></div>`;
      return `<div class="field"><div class="label">${i + 1}. ${esc(f.label)}${f.required ? ' <span style="color:#dc2626">*</span>' : ""}</div>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}${answer}</div>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
      @page{margin:18mm}*{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;font-size:14px}
      .head{border-bottom:3px solid ${brand};padding-bottom:12px;margin-bottom:18px}
      .row{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;color:${brand}}
      .brand img{height:32px}
      .client{font-size:11px;color:${soft};text-transform:uppercase;letter-spacing:.06em;font-weight:700;text-align:right}
      h1{font-size:20px;margin:14px 0 4px}
      .intro{font-size:13px;color:${soft};margin:0;white-space:pre-wrap}
      .field{margin:15px 0;page-break-inside:avoid}
      .label{font-weight:700}.hint{font-size:12px;color:${soft};margin-top:2px}
      .ans{margin-top:6px;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;min-height:26px;white-space:pre-wrap}
      .blank{margin-top:10px;height:84px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,#cbd5e1 27px,#cbd5e1 28px)}
      .foot{margin-top:26px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:${soft};display:flex;justify-content:space-between}
    </style></head><body>
      <div class="head"><div class="row">
        <div class="brand"><img src="${origin}/logo.png" alt="" onerror="this.style.display='none'">Amal &amp; Company</div>
        <div class="client">${esc(CLIENT.tocTitle)}</div>
      </div><h1>${esc(r.title)}</h1>${r.body ? `<p class="intro">${esc(r.body)}</p>` : ""}</div>
      ${rowsHtml}
      <div class="foot"><span>Amal &amp; Company · ${esc(CLIENT.tocTitle)}</span><span>${new Date().toLocaleDateString()}</span></div>
      <scr` + `ipt>window.onload=function(){setTimeout(function(){window.print()},200)}</scr` + `ipt>
    </body></html>`;
    const w = window.open("", "_blank", "width=880,height=1100");
    if (!w) { toast("Allow pop-ups to print the worksheet", "error"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* sheet header */}
      <div className="flex items-center justify-between gap-2 border-b border-dashed bg-secondary/40 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
          <Icons.PencilRuler className="h-3.5 w-3.5" /> Worksheet · for your program
        </span>
        <span className="text-xs font-medium text-muted-foreground">{filled}/{fields.length} answered</span>
      </div>

      {r.body && <p className="whitespace-pre-wrap border-b bg-secondary/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground sm:px-6">{r.body}</p>}

      {/* One prompt per slide — swipe or use the arrows to move left / right. */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fields.map((f, i) => (
          <div key={f.id} className="w-full shrink-0 snap-center px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-xl">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt {i + 1} of {fields.length}</span>
                {(vals[f.id] ?? "").trim() && <Icons.CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
              </div>
              <label className="mt-3 block text-base font-semibold leading-snug">{f.label}{f.required && <span className="text-[hsl(var(--danger))]"> *</span>}</label>
              {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
              {f.kind === "area" ? (
                // Pick one of the 6 Areas of Focus.
                <select
                  value={vals[f.id] ?? ""}
                  onChange={(e) => {
                    set(f.id, e.target.value);
                    // Changing the area clears any outcome that no longer fits.
                    const outs: readonly string[] = AREAS_OF_FOCUS.find((a) => a.name === e.target.value)?.outcomes ?? [];
                    fields.filter((x) => x.kind === "outcome").forEach((x) => {
                      if (!outs.includes(vals[x.id] ?? "")) setVals((p) => ({ ...p, [x.id]: "" }));
                    });
                  }}
                  className="mt-3 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Choose an area of focus…</option>
                  {AREAS_OF_FOCUS.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              ) : f.kind === "outcome" ? (
                // Outcomes for the chosen Area of Focus (cascades from it).
                chosenArea ? (
                  <select
                    value={vals[f.id] ?? ""}
                    onChange={(e) => set(f.id, e.target.value)}
                    className="mt-3 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    <option value="">Choose an outcome…</option>
                    {outcomeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed bg-secondary/30 px-3 py-2.5 text-sm text-muted-foreground">
                    Choose an area of focus first, then its outcomes appear here.
                  </p>
                )
              ) : f.long ? (
                <textarea
                  value={vals[f.id] ?? ""}
                  onChange={(e) => set(f.id, e.target.value)}
                  rows={5}
                  placeholder="Write your answer…"
                  className="worksheet-lines mt-3 block w-full resize-y rounded-lg border bg-background px-3 text-sm leading-[30px] outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              ) : (
                <input
                  value={vals[f.id] ?? ""}
                  onChange={(e) => set(f.id, e.target.value)}
                  placeholder="Write your answer…"
                  className="mt-3 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              )}

              {/* Explicit Submit — sends this answer now and moves to the next
                  prompt (so it feels like submitting each one, Mentimeter-style). */}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={!(vals[f.id] ?? "").trim()}
                  onClick={() => {
                    onSave(vals, canComplete);
                    setSubmittedIds((p) => new Set(p).add(f.id));
                    if (i < fields.length - 1) { toast("Submitted ✓"); setTimeout(() => goTo(i + 1), 200); }
                    else toast(canComplete ? "All submitted ✓" : "Submitted ✓");
                  }}
                >
                  <Icons.Send className="h-4 w-4" /> {i < fields.length - 1 ? "Submit & next" : "Submit"}
                </Button>
                {submittedIds.has(f.id) && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--success))]">
                    <Icons.CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* pager: prev / dots / next */}
      {fields.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t bg-secondary/20 px-4 py-2.5 sm:px-6">
          <button onClick={() => goTo(active - 1)} disabled={atStart} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/70 hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent">
            <Icons.ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {fields.map((f, i) => (
              <button
                key={f.id}
                onClick={() => goTo(i)}
                aria-label={`Go to prompt ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-accent" : (vals[f.id] ?? "").trim() ? "w-2 bg-accent/50" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <button onClick={() => goTo(active + 1)} disabled={atEnd} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/70 hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent">
            Next <Icons.ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* footer: progress + auto-save note + a single Print option */}
      <div className="flex flex-wrap items-center gap-3 border-t bg-secondary/30 px-4 py-3 sm:px-6">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Icons.Check className="h-3.5 w-3.5" /> {done ? "Saved" : "Saves automatically"}
          </span>
        </div>
        {filled > 0 && (
          <Button size="sm" variant="outline" onClick={() => {
            if (!window.confirm("Clear your answers and start this worksheet over?")) return;
            setVals({});
            goTo(0);
            toast("Worksheet reset — start fresh");
          }}>
            <Icons.RotateCcw className="h-4 w-4" /> Redo
          </Button>
        )}
        <Button size="sm" onClick={printWorksheet}><Icons.Printer className="h-4 w-4" /> Print</Button>
      </div>
    </div>
  );
}
