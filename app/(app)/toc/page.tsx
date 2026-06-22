"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import Link from "next/link";
import { Card, Badge, Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { loadToc, saveToc } from "@/lib/store";
import {
  STARTER_TOC, EXAMPLES, BAND_Y, NODE_DEFAULT_TITLE, emptyToc,
  type TocDoc, type TocDocNode, type TocDocEdge,
} from "@/lib/toc-templates";
import type { NodeType } from "@/lib/types";
import { TocTutorial } from "@/components/toc-tutorial";

type ChipTone = "default" | "accent" | "success" | "warning";
const NODE_STYLE: Record<NodeType, { label: string; ring: string; chip: ChipTone; bg: string }> = {
  goal: { label: "Goal / Impact", ring: "border-l-4 border-l-[hsl(var(--primary))]", chip: "default", bg: "bg-[hsl(var(--primary))]" },
  outcome: { label: "Outcome", ring: "border-l-4 border-l-[hsl(var(--accent))]", chip: "accent", bg: "bg-[hsl(var(--accent))]" },
  output: { label: "Output", ring: "border-l-4 border-l-[hsl(var(--success))]", chip: "success", bg: "bg-[hsl(var(--success))]" },
  activity: { label: "Activity", ring: "border-l-4 border-l-[hsl(var(--warning))]", chip: "warning", bg: "bg-[hsl(var(--warning))]" },
};
const TYPES: NodeType[] = ["goal", "outcome", "output", "activity"];
const NODE_W = 200;
const NODE_H = 92;

export default function TocBuilder() {
  const { user } = useAuth();
  const toast = useToast();

  const [doc, setDoc] = useState<TocDoc>(emptyToc());
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showTemplates, setShowTemplates] = useState(false);

  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const skipSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes = doc.nodes;
  const edges = doc.edges;

  // ---- load this learner's saved TOC ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      const saved = await loadToc(user.email);
      skipSave.current = true;
      setDoc(saved && saved.nodes ? saved : emptyToc());
      setLoaded(true);
    })();
  }, [user?.email]);

  // ---- autosave (debounced) ----
  useEffect(() => {
    if (!loaded || !user) return;
    if (skipSave.current) { skipSave.current = false; return; }
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveToc(user.email, doc);
      setStatus("saved");
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc, loaded, user?.email]);

  function update(mut: (d: TocDoc) => TocDoc) { setDoc((d) => mut(d)); }

  function addNode(type: NodeType, title?: string) {
    const id = `n-${Date.now()}-${Math.round(Math.random() * 999)}`;
    const node: TocDocNode = {
      id, type,
      title: title ?? NODE_DEFAULT_TITLE[type],
      narrative: "",
      x: 60 + Math.round(Math.random() * 360),
      y: BAND_Y[type] + Math.round(Math.random() * 30),
    };
    update((d) => ({ ...d, nodes: [...d.nodes, node] }));
    setSelected(id); setSelectedEdge(null);
    if (!title) toast(`${NODE_STYLE[type].label} added — edit it on the right`);
    else toast(`Added: ${title}`);
  }

  function removeNode(id: string) {
    update((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== id), edges: d.edges.filter((e) => e.from !== id && e.to !== id) }));
    setSelected(null);
    toast("Node removed");
  }

  function removeEdge(id: string) {
    update((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }));
    setSelectedEdge(null);
  }

  function patchNode(id: string, patch: Partial<TocDocNode>) {
    update((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }
  function patchEdge(id: string, patch: Partial<TocDocEdge>) {
    update((d) => ({ ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function tryConnect(targetId: string) {
    if (!connectFrom) { setConnectFrom(targetId); return; }
    if (connectFrom === targetId) { setConnectFrom(null); return; }
    const exists = edges.some((e) => e.from === connectFrom && e.to === targetId);
    if (exists) { toast("Those are already connected", "error"); setConnectFrom(null); return; }
    const edge: TocDocEdge = { id: `e-${Date.now()}`, from: connectFrom, to: targetId };
    update((d) => ({ ...d, edges: [...d.edges, edge] }));
    toast("Connected ✓");
    setConnectFrom(null);
  }

  function loadStarter() {
    skipSave.current = false;
    setDoc({ nodes: STARTER_TOC.nodes.map((n) => ({ ...n })), edges: STARTER_TOC.edges.map((e) => ({ ...e })) });
    setShowTemplates(false);
    setSelected(null); setSelectedEdge(null);
    toast("MAS-GLA starter loaded — edit it to fit your program");
  }
  function startBlank() {
    setShowTemplates(false);
    addNode("goal");
  }

  // ---- drag ----
  function onPointerDown(e: React.PointerEvent, node: TocDocNode) {
    setSelected(node.id); setSelectedEdge(null);
    if (connectMode) { tryConnect(node.id); return; }
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { id: node.id, dx: e.clientX - rect.left - node.x, dy: e.clientY - rect.top - node.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { id, dx, dy } = dragRef.current;
    dragRef.current.moved = true;
    const x = Math.max(0, e.clientX - rect.left - dx);
    const y = Math.max(0, e.clientY - rect.top - dy);
    update((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }));
  }
  function onPointerUp() { dragRef.current = null; }

  // ---- validation ----
  const warnings = useMemo(() => {
    const out: { level: "error" | "warn"; text: string }[] = [];
    nodes.filter((n) => n.type === "activity").forEach((a) => {
      if (!edges.some((e) => e.from === a.id)) out.push({ level: "warn", text: `“${a.title}” isn't connected to an output yet.` });
    });
    nodes.filter((n) => n.type === "outcome").forEach((o) => {
      if (!edges.some((e) => e.to === o.id)) out.push({ level: "error", text: `Outcome “${o.title}” has no output feeding it.` });
    });
    edges.forEach((e) => {
      const to = nodes.find((n) => n.id === e.to);
      if (to?.type === "outcome" && !(e.assumption ?? "").trim()) {
        const from = nodes.find((n) => n.id === e.from);
        out.push({ level: "warn", text: `Add an assumption: ${trunc(from?.title)} → ${trunc(to.title)}` });
      }
    });
    if (nodes.length > 0 && !nodes.some((n) => n.type === "goal")) out.push({ level: "warn", text: "Add a Goal so the chain has somewhere to lead." });
    return out;
  }, [nodes, edges]);

  const sel = nodes.find((n) => n.id === selected) ?? null;
  const selEdge = edges.find((e) => e.id === selectedEdge) ?? null;
  const counts = useMemo(() => {
    const c: Record<NodeType, number> = { goal: 0, outcome: 0, output: 0, activity: 0 };
    nodes.forEach((n) => c[n.type]++);
    return c;
  }, [nodes]);

  if (!loaded) {
    return <div className="flex h-[60vh] items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Theory of Change Builder</h1>
          <p className="text-sm text-muted-foreground">Add a node, drag to arrange, then connect them. Your work saves automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveBadge status={status} />
          <Link href="/logframe" className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
            <Icons.Table2 className="h-4 w-4" /> Logframe
          </Link>
        </div>
      </div>

      {/* Animated, self-playing tutorial (auto-opens first visit; blue button reopens) */}
      <TocTutorial />

      {/* Toolbar */}
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add</span>
        {TYPES.map((t) => (
          <button key={t} onClick={() => addNode(t)} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary">
            <span className={`h-2.5 w-2.5 rounded ${NODE_STYLE[t].bg}`} /> {NODE_STYLE[t].label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          onClick={() => { setConnectMode((v) => !v); setConnectFrom(null); }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${connectMode ? "bg-accent text-accent-foreground" : "border bg-card hover:bg-secondary"}`}
        >
          <Icons.Spline className="h-4 w-4" /> {connectMode ? "Connecting…" : "Connect"}
        </button>
        <button onClick={() => setShowTemplates(true)} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary">
          <Icons.LayoutTemplate className="h-4 w-4" /> Templates
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{counts.goal}G · {counts.outcome}O · {counts.output}Op · {counts.activity}A</span>
      </Card>

      {connectMode && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          <Icons.MousePointerClick className="h-4 w-4 shrink-0" />
          {connectFrom ? "Now click the node it leads to." : "Click the starting node, then the node it leads to. Build upward: Activity → Output → Outcome → Goal."}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <Card className="relative overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
            {TYPES.map((t) => (
              <span key={t} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${NODE_STYLE[t].bg}`} /> {NODE_STYLE[t].label}</span>
            ))}
          </div>
          <div
            ref={canvasRef}
            className="grid-paper relative h-[620px] w-full touch-none overflow-auto"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="pointer-events-auto max-w-sm">
                  <Icons.Workflow className="mx-auto h-9 w-9 text-accent" />
                  <p className="mt-2 font-semibold">Start your Theory of Change</p>
                  <p className="mt-1 text-sm text-muted-foreground">Load a ready starter you can edit, or begin from a goal. You can also drop in suggested pieces from the right.</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <Button size="sm" onClick={loadStarter}><Icons.Sparkles className="h-4 w-4" /> Load starter</Button>
                    <Button size="sm" variant="outline" onClick={startBlank}><Icons.Plus className="h-4 w-4" /> Start from a goal</Button>
                  </div>
                </div>
              </div>
            )}

            {/* edges */}
            <svg className="absolute inset-0 h-full w-full" style={{ minHeight: 620 }}>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--muted-foreground))" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const a = nodes.find((n) => n.id === edge.from);
                const b = nodes.find((n) => n.id === edge.to);
                if (!a || !b) return null;
                const x1 = a.x + NODE_W / 2, y1 = a.y;
                const x2 = b.x + NODE_W / 2, y2 = b.y + NODE_H;
                const midY = (y1 + y2) / 2;
                const missing = b.type === "outcome" && !(edge.assumption ?? "").trim();
                const active = edge.id === selectedEdge;
                const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                return (
                  <g key={edge.id} className="cursor-pointer" onClick={() => { setSelectedEdge(edge.id); setSelected(null); }}>
                    {/* invisible fat hit area */}
                    <path d={path} fill="none" stroke="transparent" strokeWidth={16} />
                    <path d={path} fill="none" markerEnd="url(#arrow)"
                      stroke={active ? "hsl(var(--accent))" : missing ? "hsl(var(--danger))" : "hsl(var(--muted-foreground))"}
                      strokeWidth={active ? 3 : 2} strokeDasharray={missing ? "5 4" : undefined} />
                    {(edge.assumption ?? "").trim() && <circle cx={(x1 + x2) / 2} cy={midY} r={5} fill="hsl(var(--accent))" />}
                  </g>
                );
              })}
            </svg>

            {/* nodes */}
            {nodes.map((node) => {
              const style = NODE_STYLE[node.type];
              const active = node.id === selected;
              const isConnectSource = connectFrom === node.id;
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => onPointerDown(e, node)}
                  className={`absolute select-none rounded-lg border bg-card p-3 shadow-sm ${style.ring} ${active ? "ring-2 ring-accent" : ""} ${isConnectSource ? "ring-2 ring-accent ring-offset-2" : ""} ${connectMode ? "cursor-pointer hover:ring-2 hover:ring-accent/60" : "cursor-grab active:cursor-grabbing"}`}
                  style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
                >
                  <Badge tone={style.chip}>{style.label}</Badge>
                  <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-snug">{node.title || "Untitled"}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Edge inspector */}
          {selEdge && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Connection</p>
                <button onClick={() => removeEdge(selEdge.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)]"><Icons.Trash2 className="h-3.5 w-3.5" /> Remove</button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{trunc(nodes.find((n) => n.id === selEdge.from)?.title, 26)} → {trunc(nodes.find((n) => n.id === selEdge.to)?.title, 26)}</p>
              {nodes.find((n) => n.id === selEdge.to)?.type === "outcome" && (
                <>
                  <label className="mt-3 block text-xs font-medium text-muted-foreground">Assumption — why do we believe this link holds?</label>
                  <textarea value={selEdge.assumption ?? ""} onChange={(e) => patchEdge(selEdge.id, { assumption: e.target.value })} placeholder="e.g. Youth attend consistently and feel they belong." className="mt-1 h-20 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </>
              )}
            </Card>
          )}

          {/* Node inspector */}
          {sel && !selEdge && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{NODE_STYLE[sel.type].label}</p>
                <button onClick={() => removeNode(sel.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)]"><Icons.Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
              <input value={sel.title} onChange={(e) => patchNode(sel.id, { title: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring" />
              <label className="mt-3 block text-xs font-medium text-muted-foreground">Type</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button key={t} onClick={() => patchNode(sel.id, { type: t })} className={`rounded-full px-2.5 py-1 text-xs font-medium ${sel.type === t ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>{NODE_STYLE[t].label}</button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-medium text-muted-foreground">Narrative (optional)</label>
              <textarea value={sel.narrative} onChange={(e) => patchNode(sel.id, { narrative: e.target.value })} placeholder="Describe this in a sentence…" className="mt-1 h-20 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </Card>
          )}

          {/* Examples palette */}
          <Card className="p-4">
            <p className="font-semibold">Add from examples</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Click any to drop it on the canvas — then edit to fit your program.</p>
            <div className="mt-3 space-y-3">
              {TYPES.map((t) => (
                <div key={t}>
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><span className={`h-2 w-2 rounded ${NODE_STYLE[t].bg}`} /> {NODE_STYLE[t].label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES[t].map((ex) => (
                      <button key={ex} onClick={() => addNode(t, ex)} className="rounded-full border bg-card px-2.5 py-1 text-left text-xs font-medium hover:bg-secondary">+ {ex}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* validation */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Logic check</p>
              {warnings.length === 0 ? <Badge tone="success">All clear</Badge> : <Badge tone="warning">{warnings.length}</Badge>}
            </div>
            <div className="mt-3 space-y-2">
              {warnings.length === 0 && <p className="text-sm text-muted-foreground">No gaps — every outcome is supported and assumptions are noted. 🎉</p>}
              {warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-md p-2 text-xs ${w.level === "error" ? "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))]" : "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]"}`}>
                  {w.level === "error" ? <Icons.AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Icons.AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <span>{w.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTemplates(false)}>
          <Card className="w-full max-w-lg p-6" >
            <div className="flex items-start justify-between" onClick={(e) => e.stopPropagation()}>
              <div>
                <p className="text-lg font-bold">Start from a template</p>
                <p className="mt-1 text-sm text-muted-foreground">Pick a ready model you can edit, or start fresh.</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><Icons.X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <button onClick={loadStarter} className="flex w-full items-start gap-3 rounded-xl border p-4 text-left hover:border-accent hover:bg-accent/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icons.Sparkles className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold">MAS-GLA youth starter</span>
                  <span className="block text-sm text-muted-foreground">A complete chain — activities → output → outcome → goal, with assumptions. Replaces the current canvas.</span>
                </span>
              </button>
              <button onClick={startBlank} className="flex w-full items-start gap-3 rounded-xl border p-4 text-left hover:border-accent hover:bg-accent/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><Icons.Plus className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold">Start from a goal</span>
                  <span className="block text-sm text-muted-foreground">A single goal node to build out yourself, with examples on hand.</span>
                </span>
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SaveBadge({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {status === "saving" ? <><Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Icons.Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Saved</>}
    </span>
  );
}

function trunc(s?: string, n = 22) { return !s ? "" : s.length > n ? s.slice(0, n) + "…" : s; }
