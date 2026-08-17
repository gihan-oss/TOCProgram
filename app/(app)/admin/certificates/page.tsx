"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, Button, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { useToast } from "@/components/toast";
import { listMembers, listProfiles, listLearnerProgress, type Member, type MemberProfile, type ProgressRow } from "@/lib/store";
import { loadModules, moduleComplete, type CourseModule } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import { renderCertificateImages, jpegToPdfBase64 } from "@/lib/certgen";
import { buildCertEmail, FEEDBACK_URL, COHORT_LABEL } from "@/lib/cert-email";

interface Person { email: string; name: string; finishedAll: boolean; }
type Result = { email: string; ok: boolean; error?: string };

function slug(s: string) { return (s || "certificate").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CertificatesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const isStaff = user?.role === "admin" || user?.role === "facilitator" || user?.role === "coordinator";

  useEffect(() => {
    (async () => {
      const [mods, mem, prof, prog] = await Promise.all([
        loadModules(), listMembers(), listProfiles(), listLearnerProgress(),
      ]);
      setModules(effectiveModules(mods));
      setMembers(mem); setProfiles(prof); setProgress(prog);
      setLoaded(true);
    })();
  }, [user?.email]);

  const nameFor = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => { if (p.email && p.name) m.set(p.email.toLowerCase(), p.name); });
    members.forEach((mem) => { if (mem.email && mem.name) m.set(mem.email.toLowerCase(), mem.name); });
    return (email: string) => m.get(email.toLowerCase()) || email.split("@")[0];
  }, [members, profiles]);

  // Everyone we know about — NOT gated on completion. "finishedAll" is info only.
  const people = useMemo<Person[]>(() => {
    const withContent = modules.filter((mod) => mod.resources.length > 0);
    const doneByEmail = new Map<string, Set<string>>();
    progress.forEach((p) => { if (p.email) doneByEmail.set(p.email.toLowerCase(), new Set(p.done ?? [])); });
    const emails = new Set<string>();
    members.forEach((m) => { if (m.email && m.role === "participant") emails.add(m.email.toLowerCase()); });
    profiles.forEach((p) => { if (p.email) emails.add(p.email.toLowerCase()); });
    progress.forEach((p) => { if (p.email) emails.add(p.email.toLowerCase()); });
    return [...emails].map((email) => {
      const done = doneByEmail.get(email) ?? new Set<string>();
      const finishedAll = withContent.length > 0 && withContent.every((mod) => moduleComplete(mod, done));
      return { email, name: nameFor(email), finishedAll };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [modules, members, profiles, progress, nameFor]);

  // default: everyone selected
  useEffect(() => { setSelected(new Set(people.map((p) => p.email))); }, [people]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? people.filter((p) => p.email.includes(n) || p.name.toLowerCase().includes(n)) : people;
  }, [people, q]);

  const toggle = (email: string) => setSelected((prev) => { const s = new Set(prev); s.has(email) ? s.delete(email) : s.add(email); return s; });
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.email));
  const toggleAllShown = () => setSelected((prev) => {
    const s = new Set(prev);
    if (allShownSelected) shown.forEach((p) => s.delete(p.email));
    else shown.forEach((p) => s.add(p.email));
    return s;
  });

  async function sendOne(rec: { email: string; name: string }): Promise<Result> {
    try {
      const { pngDataUrl, jpegDataUrl } = await renderCertificateImages({ name: rec.name, cohort: COHORT_LABEL });
      const png = pngDataUrl.split(",")[1] || "";
      const attachments: { name: string; content: string }[] = [{ name: `${slug(rec.name)}-certificate.png`, content: png }];
      try { const pdf = jpegToPdfBase64(jpegDataUrl); if (pdf) attachments.push({ name: `${slug(rec.name)}-certificate.pdf`, content: pdf }); } catch { /* PNG still attaches */ }
      const { subject, html } = buildCertEmail(rec.name.split(" ")[0], FEEDBACK_URL);
      const res = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: rec.email, subject, html, attachments }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) return { email: rec.email, ok: false, error: j.error || `HTTP ${res.status}` };
      return { email: rec.email, ok: true };
    } catch (e) {
      return { email: rec.email, ok: false, error: e instanceof Error ? e.message : "failed" };
    }
  }

  async function sendTestToMe() {
    if (!user?.email) return;
    setSending(true); setResults([]); setSentCount(0);
    const r = await sendOne({ email: user.email, name: user.name || "Test Recipient" });
    setResults([r]); setSending(false);
    toast(r.ok ? `Test certificate sent to ${user.email}` : `Failed: ${r.error}`, r.ok ? "success" : "error");
  }

  async function sendToSelected() {
    const recipients = people.filter((p) => selected.has(p.email));
    if (!recipients.length) return;
    if (!window.confirm(`Send the certificate email to ${recipients.length} people? Each gets their certificate (PNG + PDF) and the ${COHORT_LABEL} form.`)) return;
    setSending(true); setResults([]); setSentCount(0);
    const out: Result[] = [];
    for (const rec of recipients) {
      out.push(await sendOne(rec)); setResults([...out]); setSentCount(out.length);
      await sleep(600);
    }
    setSending(false);
    const ok = out.filter((r) => r.ok).length;
    toast(`Sent ${ok}/${out.length} certificates.`, ok === out.length ? "success" : "error");
  }

  if (!isStaff) return <div className="mx-auto max-w-xl"><EmptyHint>This page is for facilitators and admins.</EmptyHint></div>;
  if (!loaded) return <div className="flex h-[50vh] items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const selCount = people.filter((p) => selected.has(p.email)).length;
  const okCount = results.filter((r) => r.ok).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send everyone their MAS GLA Theory of Change certificate (as an image + PDF) with the {COHORT_LABEL} form. Pick who to send to — completion is not required.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-muted-foreground">Selected to send</p><p className="text-3xl font-extrabold tabular-nums">{selCount}<span className="text-lg text-muted-foreground"> / {people.length}</span></p></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={sendTestToMe} disabled={sending}>
              {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Mail className="h-4 w-4" />} Send test to me
            </Button>
            <Button size="sm" onClick={sendToSelected} disabled={sending || selCount === 0}>
              {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />}
              {sending ? `Sending ${sentCount}/${selCount}…` : `Send to ${selCount} selected`}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Send a test to yourself first to confirm the look, then send to your selected list.</p>
      </Card>

      {results.length > 0 && (
        <Card className="p-5">
          <p className="font-semibold">Send results — {okCount}/{results.length} delivered</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {results.map((r) => (
              <li key={r.email} className="flex items-center justify-between">
                <span>{r.email}</span>
                {r.ok ? <Badge tone="accent"><Icons.Check className="h-3 w-3" /> sent</Badge> : <span className="text-xs text-[hsl(var(--danger))]">{r.error}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Recipients ({people.length})</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="modal-input pl-9" />
            </div>
            <Button size="sm" variant="outline" onClick={toggleAllShown}>{allShownSelected ? "Clear" : "Select all"}</Button>
          </div>
        </div>
        {people.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No participants found yet.</p>
        ) : (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.email}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
                  <input type="checkbox" checked={selected.has(p.email)} onChange={() => toggle(p.email)} className="h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                  </span>
                  {p.finishedAll && <Badge tone="success"><Icons.CheckCircle2 className="h-3 w-3" /> 5/5</Badge>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
