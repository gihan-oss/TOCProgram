// Shared helpers for turning saved worksheet answers into (a) a per-person
// printable packet and (b) a group analysis. Both the Learner Tracking page and
// the Group Analysis page read from here so the two views stay consistent.

import type { CourseModule, Resource } from "@/lib/content";
import { CLIENT } from "@/lib/mas";

// ---- Shapes -----------------------------------------------------------------

export interface PersonRow {
  email: string;
  name: string;
  worksheets: Record<string, Record<string, string>>; // resourceId -> fieldId -> value
}

export interface PacketField { label: string; hint?: string; value: string }
export interface PacketWorksheet {
  moduleTitle: string;
  moduleIndex: number;
  worksheetId: string;
  worksheetTitle: string;
  fields: PacketField[];
  answered: number;
  total: number;
}

export interface PromptAnswer { name: string; value: string }
export interface GroupPrompt { fieldId: string; label: string; answers: PromptAnswer[] }
export interface GroupWorksheet {
  moduleTitle: string;
  moduleIndex: number;
  worksheetId: string;
  worksheetTitle: string;
  prompts: GroupPrompt[];
}

// Every worksheet resource across all modules, in module → resource order.
export function worksheetResources(modules: CourseModule[]): { module: CourseModule; index: number; ws: Resource }[] {
  const out: { module: CourseModule; index: number; ws: Resource }[] = [];
  modules.forEach((m, i) => {
    for (const ws of m.resources) if (ws.type === "Worksheet") out.push({ module: m, index: i, ws });
  });
  return out;
}

// ---- Compile ----------------------------------------------------------------

export function compilePersonPacket(
  modules: CourseModule[],
  worksheets: Record<string, Record<string, string>>,
): PacketWorksheet[] {
  return worksheetResources(modules).map(({ module, index, ws }) => {
    const ans = worksheets[ws.id] ?? {};
    const fields: PacketField[] = (ws.fields ?? []).map((f) => ({
      label: f.label,
      hint: f.hint,
      value: (ans[f.id] ?? "").trim(),
    }));
    return {
      moduleTitle: module.title,
      moduleIndex: index,
      worksheetId: ws.id,
      worksheetTitle: ws.title,
      fields,
      answered: fields.filter((f) => f.value).length,
      total: fields.length,
    };
  });
}

export function compileGroup(modules: CourseModule[], rows: PersonRow[]): GroupWorksheet[] {
  return worksheetResources(modules).map(({ module, index, ws }) => {
    const prompts: GroupPrompt[] = (ws.fields ?? []).map((f) => {
      const answers: PromptAnswer[] = [];
      for (const r of rows) {
        const v = (r.worksheets[ws.id]?.[f.id] ?? "").trim();
        if (v) answers.push({ name: r.name || r.email.split("@")[0], value: v });
      }
      answers.sort((a, b) => a.name.localeCompare(b.name));
      return { fieldId: f.id, label: f.label, answers };
    });
    return { moduleTitle: module.title, moduleIndex: index, worksheetId: ws.id, worksheetTitle: ws.title, prompts };
  });
}

// A compact payload for the AI analysis endpoint: prompts with everyone's
// answers, lightly trimmed so a big cohort still fits comfortably in context.
export function buildAnalysisPayload(group: GroupWorksheet[], participantCount: number) {
  const MAX_ANSWER = 600;
  const worksheets = group
    .map((w) => ({
      module: `Module ${w.moduleIndex + 1}`,
      title: w.worksheetTitle,
      prompts: w.prompts
        .filter((p) => p.answers.length > 0)
        .map((p) => ({
          prompt: p.label,
          answers: p.answers.map((a) => (a.value.length > MAX_ANSWER ? a.value.slice(0, MAX_ANSWER) + "…" : a.value)),
        })),
    }))
    .filter((w) => w.prompts.length > 0);
  return { participantCount, worksheets };
}

// ---- Printing ---------------------------------------------------------------
// Both builders produce a self-contained, Amal & Company–branded HTML document
// and open it in a new window that auto-prints (same approach the worksheet
// player already uses), so we never touch app-wide print styles.

const BRAND = "#5b4bd6", ACCENT = "#0ea5a4", SOFT = "#6b7280", INK = "#1f2937";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sharedStyles(): string {
  return `@page{margin:16mm}*{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:${INK};margin:0;font-size:13.5px;line-height:1.5}
    .head{border-bottom:3px solid ${BRAND};padding-bottom:12px;margin-bottom:18px}
    .row{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;color:${BRAND}}
    .brand img{height:30px}
    .client{font-size:11px;color:${SOFT};text-transform:uppercase;letter-spacing:.06em;font-weight:700;text-align:right}
    h1{font-size:21px;margin:14px 0 2px}
    .sub{font-size:12px;color:${SOFT};margin:0}
    .ws{margin:20px 0;page-break-inside:avoid}
    .ws-title{font-weight:800;font-size:15px;border-left:4px solid ${ACCENT};padding-left:9px;margin-bottom:2px}
    .ws-meta{font-size:11px;color:${SOFT};margin:0 0 8px 13px;text-transform:uppercase;letter-spacing:.04em;font-weight:700}
    .field{margin:11px 0;page-break-inside:avoid}
    .label{font-weight:700;font-size:13px}
    .ans{margin-top:5px;border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;white-space:pre-wrap}
    .empty{margin-top:5px;color:#9ca3af;font-style:italic}
    .person{margin-top:4px}.person b{color:${BRAND}}
    .foot{margin-top:26px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:${SOFT};display:flex;justify-content:space-between}
    .stat{display:inline-block;margin-right:18px;font-size:12px;color:${SOFT}}.stat b{color:${INK};font-size:15px}
    .synth{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 16px;margin:16px 0}
    .synth h2{color:${BRAND};font-size:15px;margin:0 0 6px}
    .none{color:#9ca3af;font-style:italic;margin:4px 0 0 13px}`;
}

function openPrint(html: string, onBlocked?: () => void): boolean {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { onBlocked?.(); return false; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

function docShell(title: string, headInner: string, bodyInner: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${sharedStyles()}</style></head><body>
    <div class="head"><div class="row">
      <div class="brand"><img src="${origin}/logo.png" alt="" onerror="this.style.display='none'">Amal &amp; Company</div>
      <div class="client">${esc(CLIENT.tocTitle)}</div>
    </div>${headInner}</div>
    ${bodyInner}
    <div class="foot"><span>Amal &amp; Company · ${esc(CLIENT.tocTitle)}</span><span>${new Date().toLocaleDateString()}</span></div>
    <scr` + `ipt>window.onload=function(){setTimeout(function(){window.print()},250)}</scr` + `ipt>
  </body></html>`;
}

/** Print one person's worksheet answers across every module. Returns false if a pop-up blocker stopped it. */
export function printPersonPacket(
  person: { name: string; email: string },
  packet: PacketWorksheet[],
  onBlocked?: () => void,
): boolean {
  const name = person.name || person.email.split("@")[0];
  const totalAnswered = packet.reduce((s, w) => s + w.answered, 0);
  const totalFields = packet.reduce((s, w) => s + w.total, 0);

  const body = packet.map((w) => {
    const fields = w.fields.map((f) => {
      const answer = f.value
        ? `<div class="ans">${esc(f.value).replace(/\n/g, "<br>")}</div>`
        : `<div class="empty">— not answered yet —</div>`;
      return `<div class="field"><div class="label">${esc(f.label)}</div>${answer}</div>`;
    }).join("");
    return `<div class="ws"><div class="ws-title">${esc(w.worksheetTitle)}</div>
      <p class="ws-meta">Module ${w.moduleIndex + 1} · ${w.moduleTitle.replace(/^Module \d+\s*[—-]\s*/, "")} · ${w.answered}/${w.total} answered</p>
      ${fields || '<p class="none">This worksheet has no prompts.</p>'}</div>`;
  }).join("");

  const head = `<h1>${esc(name)} — Worksheet packet</h1>
    <p class="sub">${esc(person.email)} · ${totalAnswered}/${totalFields} prompts answered across ${packet.length} worksheet${packet.length === 1 ? "" : "s"}</p>`;
  return openPrint(docShell(`${name} — Worksheets`, head, body), onBlocked);
}

/** Print the whole-group analysis: stats, optional AI synthesis, then every prompt with everyone's answers. */
export function printGroupAnalysis(
  group: GroupWorksheet[],
  meta: { participants: number; responded: number; synthesis?: string },
  onBlocked?: () => void,
): boolean {
  const body = [
    `<p style="margin:0 0 14px">
      <span class="stat"><b>${meta.participants}</b> participants</span>
      <span class="stat"><b>${meta.responded}</b> have answered</span>
    </p>`,
    meta.synthesis ? `<div class="synth"><h2>AI group analysis</h2>${mdToHtml(meta.synthesis)}</div>` : "",
    ...group.map((w) => {
      const prompts = w.prompts.map((p) => {
        if (p.answers.length === 0) return `<div class="field"><div class="label">${esc(p.label)}</div><p class="none">No answers yet.</p></div>`;
        const list = p.answers.map((a) => `<div class="ans person"><b>${esc(a.name)}:</b> ${esc(a.value).replace(/\n/g, "<br>")}</div>`).join("");
        return `<div class="field"><div class="label">${esc(p.label)} <span style="color:${SOFT};font-weight:600">(${p.answers.length})</span></div>${list}</div>`;
      }).join("");
      return `<div class="ws"><div class="ws-title">${esc(w.worksheetTitle)}</div>
        <p class="ws-meta">Module ${w.moduleIndex + 1}</p>${prompts}</div>`;
    }),
  ].join("");

  const head = `<h1>Group analysis — worksheets</h1>
    <p class="sub">Every participant's answers, compiled by prompt${meta.synthesis ? ", with an AI synthesis" : ""}.</p>`;
  return openPrint(docShell("Group analysis — worksheets", head, body), onBlocked);
}

// Minimal markdown → HTML for the synthesis inside the print document (headings,
// bold, and bullet lists). Kept tiny and escape-safe.
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  let html = "", inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bold = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    if (/^#{1,6}\s/.test(line)) { closeList(); html += `<p style="font-weight:800;margin:8px 0 2px">${bold(line.replace(/^#{1,6}\s/, ""))}</p>`; }
    else if (/^\s*[-•*]\s/.test(line)) { if (!inList) { html += "<ul style='margin:4px 0 4px 18px'>"; inList = true; } html += `<li>${bold(line.replace(/^\s*[-•*]\s/, ""))}</li>`; }
    else if (line.trim() === "") { closeList(); }
    else { closeList(); html += `<p style="margin:4px 0">${bold(line)}</p>`; }
  }
  closeList();
  return html;
}
