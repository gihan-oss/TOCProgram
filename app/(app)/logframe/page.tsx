"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { downloadFile } from "@/lib/utils";
import { TOC_NODES, INDICATORS, ASSUMPTIONS } from "@/lib/data";
import type { NodeType } from "@/lib/types";

const ROW_ORDER: NodeType[] = ["goal", "outcome", "output", "activity"];
const ROW_LABEL: Record<NodeType, string> = { goal: "Goal", outcome: "Outcome", output: "Output", activity: "Activity" };

interface Row {
  level: NodeType;
  narrative: string;
  indicators: string;
  mov: string;
  assumptions: string;
}

function buildRows(): Row[] {
  return ROW_ORDER.map((level) => {
    const nodes = TOC_NODES.filter((n) => n.type === level);
    const inds = INDICATORS.filter((i) => i.level === level).map((i) => i.name);
    const movs = INDICATORS.filter((i) => i.level === level).map((i) => i.meansOfVerification);
    const assumps = ASSUMPTIONS.filter((a) => nodes.some((n) => n.assumptions.includes(a.id))).map((a) => a.statement);
    return {
      level,
      narrative: nodes.map((n) => n.title).join("\n"),
      indicators: inds.join("\n"),
      mov: Array.from(new Set(movs)).join("\n"),
      assumptions: assumps.join("\n"),
    };
  });
}

export default function LogframePage() {
  const [rows, setRows] = useState<Row[]>(buildRows);
  const synced = useMemo(() => JSON.stringify(rows) === JSON.stringify(buildRows()), [rows]);
  const toast = useToast();

  function edit(level: NodeType, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => (r.level === level ? { ...r, [field]: value } : r)));
  }

  function exportAs(fmt: string) {
    const header = ["Level", "Narrative Summary", "Indicators", "Means of Verification", "Assumptions"];
    const cell = (s: string) => `"${s.replace(/\n/g, " · ").replace(/"/g, '""')}"`;
    const csv = [
      header.join(","),
      ...rows.map((r) => [ROW_LABEL[r.level], r.narrative, r.indicators, r.mov, r.assumptions].map(cell).join(",")),
    ].join("\n");
    if (fmt === "Excel") downloadFile("logframe.csv", csv, "text/csv");
    else if (fmt === "Word") downloadFile("logframe.doc", `Logframe\n\n${rows.map((r) => `${ROW_LABEL[r.level]}\nNarrative: ${r.narrative}\nIndicators: ${r.indicators}\nMoV: ${r.mov}\nAssumptions: ${r.assumptions}\n`).join("\n")}`, "application/msword");
    else downloadFile("logframe.txt", csv, "text/plain");
    toast(`Logframe exported as ${fmt}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logframe Builder</h1>
          <p className="text-sm text-muted-foreground">Auto-generated from your Theory of Change · inline editing · bidirectional sync</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs ${synced ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}`}>
            {synced ? <Icons.RefreshCw className="h-3.5 w-3.5" /> : <Icons.AlertTriangle className="h-3.5 w-3.5" />}
            {synced ? "Synced with TOC" : "Edited — differs from TOC"}
          </span>
          <button onClick={() => setRows(buildRows())} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
            <Icons.RefreshCw className="h-4 w-4" /> Re-sync
          </button>
          {["PDF", "Word", "Excel"].map((fmt) => (
            <button key={fmt} onClick={() => exportAs(fmt)} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
              <Icons.Download className="h-4 w-4" /> {fmt}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="w-28 px-4 py-3 font-semibold">Level</th>
                <th className="px-4 py-3 font-semibold">Narrative Summary</th>
                <th className="px-4 py-3 font-semibold">Indicators</th>
                <th className="px-4 py-3 font-semibold">Means of Verification</th>
                <th className="px-4 py-3 font-semibold">Assumptions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.level} className="border-b align-top">
                  <td className="px-4 py-3">
                    <Badge tone={row.level === "goal" ? "default" : row.level === "outcome" ? "accent" : row.level === "output" ? "success" : "warning"}>
                      {ROW_LABEL[row.level]}
                    </Badge>
                  </td>
                  {(["narrative", "indicators", "mov", "assumptions"] as const).map((field) => (
                    <td key={field} className="px-2 py-2">
                      <textarea
                        value={row[field]}
                        onChange={(e) => edit(row.level, field, e.target.value)}
                        rows={Math.max(2, row[field].split("\n").length)}
                        className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none hover:border-border focus:border-border focus:bg-background focus:ring-2 focus:ring-ring"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Icons.MoveVertical className="h-4 w-4 text-accent" /> Vertical logic</p>
          <p className="mt-1 text-sm text-muted-foreground">If activities are delivered → outputs are produced → outcomes occur → the goal is achieved.</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Icons.MoveHorizontal className="h-4 w-4 text-accent" /> Horizontal logic</p>
          <p className="mt-1 text-sm text-muted-foreground">Each level pairs indicators with means of verification, qualified by the assumptions that must hold.</p>
        </Card>
      </div>
    </div>
  );
}
