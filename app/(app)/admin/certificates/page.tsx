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

interface Recipient { email: string; name: string; }
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

  const eligible = useMemo<Recipient[]>(() => {
    const withContent = modules.filter((mod) => mod.resources.length > 0);
    if (withContent.length === 0) return [];
    return progress
      .filter((p) => {
        const done = new Set(p.done ?? []);
        return withContent.every((mod) => moduleComplete(mod, done));
      })
      .map((p) => ({ email: p.email, name: nameFor(p.email) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [modules, progress, nameFor]);

  async function sendOne(rec: Recipient): Promise<Result> {
    try {
      const { pngDataUrl, jpegDataUrl } = await renderCertificateImages({ name: rec.name, cohort: COHORT_LABEL });
      const png = pngDataUrl.split(",")[1] || "";
      const attachments: { name: string; content: string }[] = [{ name: `${slug(rec.name)}-certificate.png`, content: png }];
      try {
        const pdf = jpegToPdfBase64(jpegDataUrl);
        if (pdf) attachments.push({ name: `${slug(rec.name)}-certificate.pdf`, content: pdf });
      } catch { /* PNG still attaches */ }
      const { subject, html } = buildCertEmail(rec.name.split(" ")[0], FEEDBACK_URL);
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: rec.email, subject, html, attachments }),
      });
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

  async function sendToAll() {
    if (!eligible.length) return;
    if (!window.confirm(`Send certificate emails to all ${eligible.length} people who finished all 5 modules? Each gets their certificate (PNG + PDF) and the ${COHORT_LABEL} feedback reminder.`)) return;
    setSending(true); setResults([]); setSentCount(0);
    const out: Result[] = [];
    for (const rec of eligible) {
      const r = await sendOne(rec);
      out.push(r); setResults([...out]); setSentCount(out.length);
      await sleep(600); // gentle pacing for Brevo
    }
    setSending(false);
    const ok = out.filter((r) => r.ok).length;
    toast(`Sent ${ok}/${out.length} certificates.`, ok === out.length ? "success" : "error");
  }

  if (!isStaff) return <div className="mx-auto max-w-xl"><EmptyHint>This page is for facilitators and admins.</EmptyHint></div>;
  if (!loaded) return <div className="flex h-[50vh] items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const okCount = results.filter((r) => r.ok).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who has completed all 5 modules gets a MAS GLA Theory of Change certificate. Sending emails their certificate as an image + PDF, along with the required {COHORT_LABEL} feedback form.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Completed all 5 modules</p>
            <p className="text-3xl font-extrabold tabular-nums">{eligible.length}</p>
          </div>
          <Icons.GraduationCap className="h-10 w-10 text-accent" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={sendTestToMe} disabled={sending}>
            {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Mail className="h-4 w-4" />} Send test to me
          </Button>
          <Button size="sm" onClick={sendToAll} disabled={sending || eligible.length === 0}>
            {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />}
            {sending ? `Sending ${sentCount}/${eligible.length}…` : `Send to all ${eligible.length}`}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Tip: send a test to yourself first to confirm the look, then send to all.</p>
      </Card>

      {results.length > 0 && (
        <Card className="p-5">
          <p className="font-semibold">Send results — {okCount}/{results.length} delivered</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {results.map((r) => (
              <li key={r.email} className="flex items-center justify-between">
                <span>{r.email}</span>
                {r.ok
                  ? <Badge tone="accent"><Icons.Check className="h-3 w-3" /> sent</Badge>
                  : <span className="text-xs text-[hsl(var(--danger))]">{r.error}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <p className="font-semibold">Eligible recipients ({eligible.length})</p>
        {eligible.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No one has finished all 5 modules yet.</p>
        ) : (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {eligible.map((r) => (
              <li key={r.email} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.email}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
