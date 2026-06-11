"use client";

import { useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { TOC_NODES, TOC_EDGES, ASSUMPTIONS } from "@/lib/data";
import type { NodeType, TocEdge, TocNode } from "@/lib/types";

type ChipTone = "default" | "accent" | "success" | "warning";
const NODE_STYLE: Record<NodeType, { label: string; ring: string; chip: ChipTone }> = {
  goal: { label: "Goal / Impact", ring: "border-l-4 border-l-[hsl(var(--primary))]", chip: "default" },
  outcome: { label: "Outcome", ring: "border-l-4 border-l-[hsl(var(--accent))]", chip: "accent" },
  output: { label: "Output", ring: "border-l-4 border-l-[hsl(var(--success))]", chip: "success" },
  activity: { label: "Activity", ring: "border-l-4 border-l-[hsl(var(--warning))]", chip: "warning" },
};

const NODE_W = 200;
const NODE_H = 92;

export default function TocBuilder() {
  const [nodes, setNodes] = useState<TocNode[]>(TOC_NODES);
  const [edges] = useState<TocEdge[]>(TOC_EDGES);
  const [selected, setSelected] = useState<string | null>("n-out1");
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- validation ---
  const warnings = useMemo(() => {
    const out: { level: "error" | "warn"; text: string }[] = [];
    // orphan activities: activity with no outgoing edge
    nodes.filter((n) => n.type === "activity").forEach((a) => {
      if (!edges.some((e) => e.from === a.id)) out.push({ level: "error", text: `Orphan activity: "${a.title}" does not connect to any output.` });
    });
    // unsupported outcomes: outcome with no incoming edge
    nodes.filter((n) => n.type === "outcome").forEach((o) => {
      if (!edges.some((e) => e.to === o.id)) out.push({ level: "error", text: `Unsupported outcome: "${o.title}" has no contributing output.` });
    });
    // missing assumption on outcome-producing edges
    edges.forEach((e) => {
      const to = nodes.find((n) => n.id === e.to);
      if (to && to.type === "outcome" && !e.assumptionId) {
        const from = nodes.find((n) => n.id === e.from);
        out.push({ level: "warn", text: `Missing assumption on connection ${from?.title?.slice(0, 22)}… → ${to.title.slice(0, 22)}…` });
      }
    });
    // failed assumption surfaced
    ASSUMPTIONS.filter((a) => a.status === "Failed").forEach((a) => {
      out.push({ level: "error", text: `Failed assumption in model: "${a.statement.slice(0, 48)}…"` });
    });
    return out;
  }, [nodes, edges]);

  function onPointerDown(e: React.PointerEvent, node: TocNode) {
    setSelected(node.id);
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { id: node.id, dx: e.clientX - rect.left - node.x, dy: e.clientY - rect.top - node.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { id, dx, dy } = dragRef.current;
    const x = Math.max(0, e.clientX - rect.left - dx);
    const y = Math.max(0, e.clientY - rect.top - dy);
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  const sel = nodes.find((n) => n.id === selected) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Theory of Change Builder</h1>
          <p className="text-sm text-muted-foreground">Drag nodes to arrange · every connection to an outcome needs an assumption · logical warnings update live</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/logframe" className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
            <Icons.Table2 className="h-4 w-4" /> Generate Logframe
          </Link>
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Icons.Plus className="h-4 w-4" /> Add node
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
            {Object.entries(NODE_STYLE).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${v.ring.replace("border-l-4 border-l-", "bg-")}`} /> {v.label}
              </span>
            ))}
          </div>
          <div
            ref={canvasRef}
            className="grid-paper relative h-[560px] w-full touch-none overflow-auto"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* edges */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ minHeight: 560 }}>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--muted-foreground))" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const a = nodes.find((n) => n.id === edge.from)!;
                const b = nodes.find((n) => n.id === edge.to)!;
                const x1 = a.x + NODE_W / 2;
                const y1 = a.y;
                const x2 = b.x + NODE_W / 2;
                const y2 = b.y + NODE_H;
                const midY = (y1 + y2) / 2;
                const missing = nodes.find((n) => n.id === edge.to)?.type === "outcome" && !edge.assumptionId;
                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      fill="none"
                      stroke={missing ? "hsl(var(--danger))" : "hsl(var(--muted-foreground))"}
                      strokeWidth={2}
                      strokeDasharray={missing ? "5 4" : undefined}
                      markerEnd="url(#arrow)"
                    />
                    {edge.assumptionId && (
                      <circle cx={(x1 + x2) / 2} cy={midY} r={5} fill="hsl(var(--accent))" />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* nodes */}
            {nodes.map((node) => {
              const style = NODE_STYLE[node.type];
              const active = node.id === selected;
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => onPointerDown(e, node)}
                  className={`absolute cursor-grab select-none rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing ${style.ring} ${active ? "ring-2 ring-accent" : ""}`}
                  style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
                >
                  <Badge tone={style.chip}>{style.label}</Badge>
                  <p className="mt-1.5 text-sm font-medium leading-snug">{node.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {node.indicators.length > 0 && <span className="flex items-center gap-0.5"><Icons.Ruler className="h-3 w-3" />{node.indicators.length}</span>}
                    {node.assumptions.length > 0 && <span className="flex items-center gap-0.5"><Icons.ShieldAlert className="h-3 w-3" />{node.assumptions.length}</span>}
                    {node.evidence.length > 0 && <span className="flex items-center gap-0.5"><Icons.Paperclip className="h-3 w-3" />{node.evidence.length}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          {/* validation */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Logic validation</p>
              {warnings.length === 0 ? <Badge tone="success">All clear</Badge> : <Badge tone="danger">{warnings.length} issues</Badge>}
            </div>
            <div className="mt-3 space-y-2">
              {warnings.length === 0 && <p className="text-sm text-muted-foreground">No orphan activities, unsupported outcomes or missing assumptions.</p>}
              {warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-md p-2 text-xs ${w.level === "error" ? "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))]" : "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]"}`}>
                  {w.level === "error" ? <Icons.AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Icons.AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  <span>{w.text}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* node inspector */}
          {sel && (
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{NODE_STYLE[sel.type].label}</p>
              <input
                value={sel.title}
                onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === sel.id ? { ...n, title: e.target.value } : n)))}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="mt-3 block text-xs font-medium text-muted-foreground">Narrative</label>
              <textarea
                value={sel.narrative}
                onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === sel.id ? { ...n, narrative: e.target.value } : n)))}
                className="mt-1 h-20 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">Indicators</p>
                {sel.indicators.length ? sel.indicators.map((i) => <p key={i} className="mt-1 rounded bg-secondary px-2 py-1 text-xs">{i}</p>) : <p className="text-xs text-muted-foreground">None yet</p>}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">Assumptions</p>
                {sel.assumptions.length ? sel.assumptions.map((aid) => {
                  const a = ASSUMPTIONS.find((x) => x.id === aid);
                  return <p key={aid} className="mt-1 rounded bg-secondary px-2 py-1 text-xs">{a?.statement}</p>;
                }) : <p className="text-xs text-muted-foreground">No assumptions linked</p>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
