"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  text: string;
  recommendations?: string[];
}

const QUICK = [
  { label: "Review my Q-Zero statement", icon: "FileCheck" },
  { label: "Identify weak assumptions", icon: "ShieldAlert" },
  { label: "Suggest indicators", icon: "Ruler" },
  { label: "Outputs vs outcomes check", icon: "GitCompare" },
  { label: "Review my logframe", icon: "Table2" },
  { label: "Find measurement gaps", icon: "SearchCheck" },
];

function respond(prompt: string): Msg {
  const p = prompt.toLowerCase();
  if (p.includes("q-zero") || p.includes("qzero")) {
    return {
      role: "assistant",
      text: "I reviewed your Q-Zero statement. It states a clear population and direction of change, which is strong. A few recommendations (I won't change anything — these are suggestions):",
      recommendations: [
        "Tighten the timebound element — add 'within 18 months' so the change is testable.",
        "The phrase 'improve literacy' is an output framing; consider 'children read at grade level' (an outcome).",
        "Add the if-then logic explicitly: IF teachers are coached, THEN classroom practice changes.",
      ],
    };
  }
  if (p.includes("assumption")) {
    return {
      role: "assistant",
      text: "Scanning your assumption registry, two assumptions look weak relative to their risk:",
      recommendations: [
        "'Parents have time to support at-home reading' is High risk and Under Review — attach evidence (parent survey) to validate it.",
        "'Donated books arrive before term' has Failed — your model depends on it. Recommend the revision workflow and a contingency activity.",
        "'Curriculum policy stays stable' is Unverified — assign an owner and a verification date.",
      ],
    };
  }
  if (p.includes("indicator") || p.includes("measurement gap")) {
    return {
      role: "assistant",
      text: "Looking at your outcomes, I found indicator coverage gaps and can suggest SMART indicators:",
      recommendations: [
        "Outcome 'Teachers apply new methods' has a process indicator but no quality measure — add 'classroom observation rubric score (1–5)'.",
        "No qualitative indicator captures teacher confidence — add a structured interview measure.",
        "Goal indicator lacks a means of verification cadence — set it to Annual with a standardized assessment.",
      ],
    };
  }
  if (p.includes("output") || p.includes("outcome")) {
    return {
      role: "assistant",
      text: "Outputs vs. outcomes review — two nodes may be mislabeled:",
      recommendations: [
        "'200 parents complete workshop' is correctly an Output (something you produce).",
        "'Children read 20 min daily' is correctly an Outcome (a behaviour change) — good.",
        "Double-check 'Teachers trained' isn't being used to claim an outcome; training attendance is an output, not changed practice.",
      ],
    };
  }
  if (p.includes("logframe")) {
    return {
      role: "assistant",
      text: "Your logframe is structurally sound. Recommendations to strengthen horizontal logic:",
      recommendations: [
        "Each indicator should pair with a single means of verification — the Output row lists two MoVs for one indicator.",
        "The Goal row is missing an assumption linking outcomes to impact — consider external factors.",
        "Add baselines to the Outcome indicators so progress is measurable.",
      ],
    };
  }
  return {
    role: "assistant",
    text: "I'm trained on Theory of Change, logframes, impact measurement, nonprofit strategy and M&E. Ask me to review your Q-Zero, find weak assumptions, suggest indicators, or check outputs vs outcomes. I only ever recommend — I never change your work automatically.",
  };
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Hi Hannah 👋 I'm your impact strategy assistant. I review and recommend — I never change your work. Where would you like to start?" },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }, respond(text)]);
    setInput("");
  }

  return (
    <div>
      <SectionTitle sub="Trained on Theory of Change, logframes, impact measurement, nonprofit strategy and M&E · recommendations only">
        AI Assistant
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="flex h-[600px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"><Icons.Sparkles className="h-4 w-4" /></div>}
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  <p>{m.text}</p>
                  {m.recommendations && (
                    <ul className="mt-2 space-y-1.5">
                      {m.recommendations.map((r, j) => (
                        <li key={j} className="flex items-start gap-2 rounded-md bg-background/60 p-2 text-xs">
                          <Icons.Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" /> {r}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.recommendations && <p className="mt-2 text-[11px] opacity-70">These are recommendations — apply them yourself when you're ready.</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask about your TOC, assumptions, indicators…"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={() => send(input)} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Icons.Send className="h-4 w-4" /></button>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <p className="text-sm font-medium">Quick reviews</p>
            <div className="mt-3 space-y-2">
              {QUICK.map((q) => {
                const IconCmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[q.icon] ?? Icons.Sparkles;
                return (
                  <button key={q.label} onClick={() => send(q.label)} className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-secondary">
                    <IconCmp className="h-4 w-4 text-accent" /> {q.label}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <Badge tone="success"><Icons.ShieldCheck className="h-3 w-3" /> Safe by design</Badge>
            <p className="mt-2 text-xs text-muted-foreground">The assistant never edits your Theory of Change, logframe or indicators. It surfaces recommendations you choose to apply.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
