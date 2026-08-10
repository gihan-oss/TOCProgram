"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle, Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { ADMIN_EMAILS, LEARNER_EMAILS } from "@/lib/access";
import { addNotification, sendEmail, listMembers, listProfiles, saveMember, removeMember, type Member, type MemberProfile } from "@/lib/store";
import { inviteEmail, genTempPassword } from "@/lib/email-templates";
import { loadClients, type Client } from "@/lib/clients";
import { MAS, CLIENT, PORTAL_URL } from "@/lib/mas";

const nameFromEmail = (email: string) =>
  email.split("@")[0].split(/[.\-_]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");

// Human labels for the access levels an admin can assign.
const ROLE_LABELS: Record<Member["role"], string> = {
  participant: "Learner",
  coordinator: "Program Coordinator",
  admin: "Administrator",
};

// Built-in accounts that always exist; saved invitations are merged on top.
const seeds: Member[] = [
  ...ADMIN_EMAILS.map((email) => ({ email, name: nameFromEmail(email), role: "admin" as const, status: "Active" as const, temp_password: "" })),
  ...LEARNER_EMAILS.map((email) => ({ email, name: nameFromEmail(email), role: "participant" as const, status: "Active" as const, temp_password: "" })),
];

// Merge member lists, de-duped by email — entries in `primary` win and stay at the front.
function mergeMembers(primary: Member[], rest: Member[]): Member[] {
  const seen = new Set(primary.map((m) => m.email));
  return [...primary, ...rest.filter((m) => !seen.has(m.email))];
}

const LOGIN_URL = `${PORTAL_URL}/login`;

export default function AccessPage() {
  const [rows, setRows] = useState<Member[]>(seeds);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("participant");
  const [client, setClient] = useState("");
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const toast = useToast();
  const { isDemo } = useAuth();

  useEffect(() => {
    let active = true;
    listMembers().then((saved) => { if (active) setRows(mergeMembers(saved, seeds)); });
    listProfiles().then((ps) => { if (active) setProfiles(ps); });
    loadClients().then((cs) => {
      if (!active) return;
      setClients(cs);
      const def = cs.find((c) => c.status === "Active") ?? cs[0];
      setClient(def?.name ?? CLIENT.name);
    });
    return () => { active = false; };
  }, []);

  // Map each person to their profile, so we can tell whether they've actually
  // opened the portal (signed in) and finished onboarding — not just "invited".
  const profByEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p]));
  function statusOf(m: Member): { label: string; tone: "success" | "accent" | "warning" | "muted"; icon: string; since?: string } {
    const p = profByEmail.get(m.email.toLowerCase());
    // last_sign_in_at reflects every visit; profile updated_at only reflects a
    // profile save, so prefer the former and fall back for older accounts.
    const since = m.last_sign_in_at ?? p?.updated_at;
    if (p?.onboarded) return { label: "Onboarded", tone: "success", icon: "CheckCircle2", since };
    if (p) return { label: "Opened portal", tone: "accent", icon: "LogIn", since };
    if (m.status === "Active") return { label: "Active", tone: "success", icon: "CheckCircle2" };
    return { label: "Invited · pending", tone: "warning", icon: "Clock" };
  }
  const fmtSince = (s?: string) => {
    if (!s) return "";
    const d = new Date(s);
    return isNaN(+d) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const clientNames = clients.map((c) => c.name);
  // The uploaded logo for a given client name — co-brands the invite email.
  const clientLogo = (name?: string) => clients.find((c) => c.name === name)?.logoUrl;

  // Parse a free-text field into unique invites — an admin can paste a mix of
  // "Name, email" pairs (name first, then the email), "Name <email>", or bare
  // emails, all separated by commas, semicolons or newlines. Names are optional;
  // the person can fill in the rest of their details when they sign in.
  function parseInvites(raw: string): { email: string; name?: string }[] {
    const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const tokens = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const out: { email: string; name?: string }[] = [];
    const seen = new Set<string>();
    let pendingName = "";
    const push = (rawEmail: string, name?: string) => {
      const e = rawEmail.toLowerCase();
      if (seen.has(e)) return;
      seen.add(e);
      out.push({ email: e, name: (name ?? "").trim() || undefined });
    };
    for (const t of tokens) {
      // "Name <email>" or "Name (email)" in a single token
      const m = t.match(/^(.*?)[<(]\s*([^\s<>()]+@[^\s<>()]+)\s*[>)]?$/);
      if (m && isEmail(m[2])) { push(m[2], m[1] || pendingName); pendingName = ""; continue; }
      if (isEmail(t)) { push(t, pendingName); pendingName = ""; continue; }
      pendingName = t; // a name waiting for the email that follows it
    }
    return out;
  }

  async function inviteOne(target: { email: string; name?: string }): Promise<{ ok: boolean; demo: boolean; pwd: string }> {
    const label = ROLE_LABELS[role];
    const name = target.name || nameFromEmail(target.email);
    const member: Member = { email: target.email, name, role, status: "Invited", temp_password: genTempPassword(), client: client || undefined };
    setRows((r) => mergeMembers([member], r));
    await saveMember(member);
    await addNotification(target.email, `You've been invited as ${label}`, `Welcome to the ${MAS.partner} Impact Portal${member.client ? ` — ${member.client}` : ""}.`);
    const { subject, html } = inviteEmail({ name: member.name, email: target.email, password: member.temp_password, role, client: member.client, clientLogoUrl: clientLogo(member.client), loginUrl: LOGIN_URL });
    const res = await sendEmail(target.email, subject, html);
    return { ok: res.ok, demo: !!res.demo, pwd: member.temp_password };
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const targets = parseInvites(email);
    if (targets.length === 0) { toast("Enter at least one valid email address.", "error"); return; }
    setEmail("");
    setBusy(true);
    if (targets.length === 1) {
      const r = await inviteOne(targets[0]);
      setBusy(false);
      toast(
        r.ok ? (r.demo ? `Invite saved — email simulated. Temp password: ${r.pwd}` : `Invitation sent ✨ Temp password: ${r.pwd}`) : "Invite saved — email failed.",
        r.ok ? "success" : "error",
      );
      return;
    }
    // bulk: invite everyone, then summarise
    let sent = 0, demo = false;
    for (const t of targets) { const r = await inviteOne(t); if (r.ok) { sent++; if (r.demo) demo = true; } }
    setBusy(false);
    toast(`${sent}/${targets.length} invitation${targets.length !== 1 ? "s" : ""} ${demo ? "simulated" : "sent"} ✨`, sent > 0 ? "success" : "error");
  }

  async function resend(m: Member) {
    // Stored temp passwords are hashed — only the plaintext generated at invite
    // time is safe to resend; otherwise generate a fresh one.
    let pwd = m.temp_password && !m.temp_password.startsWith("$2") ? m.temp_password : "";
    if (!pwd) {
      pwd = genTempPassword();
      const updated = { ...m, temp_password: pwd };
      await saveMember(updated);
      setRows((r) => r.map((x) => (x.email === m.email ? updated : x)));
    }
    const { subject, html } = inviteEmail({ name: m.name, email: m.email, password: pwd, role: m.role, client: m.client, clientLogoUrl: clientLogo(m.client), loginUrl: LOGIN_URL });
    const res = await sendEmail(m.email, subject, html);
    toast(
      res.ok ? (res.demo ? `Email simulated. Temp password: ${pwd}` : "Credentials re-sent ✨") : `Failed: ${res.error ?? "unknown error"}`,
      res.ok ? "success" : "error",
    );
  }

  async function resendAllInvited() {
    const invited = rows.filter((r) => r.status === "Invited" && (filter === "All" || (r.client ?? "") === filter));
    if (invited.length === 0) { toast("No invited members to resend to here."); return; }
    setBusy(true);
    let sent = 0, demo = false;
    for (const m of invited) {
      let pwd = m.temp_password && !m.temp_password.startsWith("$2") ? m.temp_password : "";
      if (!pwd) { pwd = genTempPassword(); const u = { ...m, temp_password: pwd }; await saveMember(u); setRows((r) => r.map((x) => (x.email === m.email ? u : x))); }
      const { subject, html } = inviteEmail({ name: m.name, email: m.email, password: pwd, role: m.role, client: m.client, clientLogoUrl: clientLogo(m.client), loginUrl: LOGIN_URL });
      const res = await sendEmail(m.email, subject, html);
      if (res.ok) { sent++; if (res.demo) demo = true; }
    }
    setBusy(false);
    toast(`${sent}/${invited.length} credential email${invited.length !== 1 ? "s" : ""} ${demo ? "simulated" : "sent"}.`, "success");
  }

  // Reset the password for a member who's already signed in (their invite
  // temp password is long gone). The server sets a fresh temp password we
  // can hand straight to the person.
  async function resetPw(m: Member) {
    if (!window.confirm(`Reset the password for ${m.email}?`)) return;
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: m.email }),
      });
      const data = (await res.json()) as { ok?: boolean; password?: string; code?: string; error?: string };
      if (res.ok && data.ok && data.password) {
        window.prompt(`New temporary password for ${m.email} — copy it and share it. They can change it after signing in.`, data.password);
        toast(`Password reset for ${m.email}`, "success");
        return;
      }
      toast(data.error ?? "Couldn't reset password", "error");
    } catch {
      toast("Couldn't reach the server. Check your connection.", "error");
    }
  }

  async function remove(target: string) {
    if (!window.confirm("Remove this member? This cannot be undone.")) return;
    setRows((r) => r.filter((x) => x.email !== target));
    await removeMember(target);
  }

  // Promote a learner to Administrator, or demote an admin back to Learner.
  async function changeRole(target: string, role: Member["role"]) {
    const m = rows.find((x) => x.email === target);
    if (!m || m.role === role) return;
    const updated: Member = { ...m, role };
    setRows((r) => r.map((x) => (x.email === target ? updated : x)));
    await saveMember(updated);
    toast(`${m.name || target} is now ${ROLE_LABELS[role]}`, "success");
  }

  // Save edits to a person (name, role, client) from the edit dialog.
  async function saveEdit(updated: Member) {
    setRows((r) => r.map((x) => (x.email === updated.email ? updated : x)));
    setEditing(null);
    await saveMember(updated);
    toast("Saved", "success");
  }

  // filter rail: All + each client (with counts) + Unassigned (if any)
  const hasUnassigned = rows.some((r) => !r.client);
  const filterOptions = ["All", ...clientNames, ...(hasUnassigned ? ["Unassigned"] : [])];
  const visible = rows.filter((r) => filter === "All" || (filter === "Unassigned" ? !r.client : (r.client ?? "") === filter));

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ArrowLeft className="h-4 w-4" /> Admin Console
      </Link>
      <SectionTitle sub="Access is restricted. Only people you invite can sign in — choose their client and access level; each gets an email with their login details.">
        People &amp; Access
      </SectionTitle>

      {/* Invite */}
      <Card className="mb-6 p-5">
        <p className="mb-3 font-semibold">Invite someone</p>
        <form onSubmit={invite} className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2.5">
            <Icons.Mail className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <textarea
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              rows={email.includes("\n") || email.length > 48 ? 3 : 1}
              placeholder="Aisha Khan, aisha@org.org, Omar Ali, omar@org.org …  (name then email, or just emails)"
              className="w-full resize-y bg-transparent py-1 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm">
              <Icons.Building2 className="h-4 w-4 text-muted-foreground" />
              <select value={client} onChange={(e) => setClient(e.target.value)} className="bg-transparent outline-none" aria-label="Client">
                {clientNames.length === 0 && <option value={CLIENT.name}>{CLIENT.name}</option>}
                {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none">
              <option value="participant">Learner</option>
              <option value="coordinator">Program Coordinator</option>
              <option value="admin">Administrator</option>
            </select>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />} Send invite
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Add a <b>name then their email</b> (e.g. <span className="font-mono">Aisha Khan, aisha@org.org</span>) — repeat for as many as you like, separated by commas or new lines. Names are optional; people can fill in the rest when they sign in. Each person gets a welcome email with their login details. Manage clients in <Link href="/admin/clients" className="text-accent hover:underline">Clients</Link>.</p>
      </Card>

      {/* filter rail + resend all */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === c ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>
              {c}{c !== "All" ? ` (${rows.filter((x) => (c === "Unassigned" ? !x.client : (x.client ?? "") === c)).length})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={resendAllInvited} disabled={busy}>
          {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />} Resend to all invited
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Access level</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const st = statusOf(r);
                const StIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[st.icon] ?? Icons.Circle;
                const since = fmtSince(st.since);
                return (
                <tr key={r.email} className="border-b">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name || nameFromEmail(r.email)}</p>
                    <p className="text-xs font-normal text-muted-foreground">{r.email}</p>
                    {/* Only show the one-time temp password while the person is
                        still genuinely pending (never opened the portal). Once
                        they've signed in / onboarded they've set their own
                        password (which is stored hashed and is NEVER visible to
                        anyone), so we stop showing the stale temp one. */}
                    {st.label === "Invited · pending" && r.temp_password && !r.temp_password.startsWith("$2") && (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        temp password: <code className="rounded bg-muted px-1 font-mono">{r.temp_password}</code>
                        <span className="ml-1 text-muted-foreground/70">(until they sign in)</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={st.tone}><StIcon className="h-3 w-3" /> {st.label}</Badge>
                    {since && <p className="mt-0.5 text-[11px] text-muted-foreground">last seen {since}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-1.5">
                      {r.role === "admin" ? <Icons.ShieldCheck className="h-3.5 w-3.5 text-accent" /> : r.role === "coordinator" ? <Icons.UserCheck className="h-3.5 w-3.5 text-accent" /> : <Icons.GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />}
                      <select
                        value={r.role}
                        onChange={(e) => changeRole(r.email, e.target.value as Member["role"])}
                        className={`rounded-lg border bg-background px-2 py-1 text-xs font-medium outline-none ${r.role !== "participant" ? "text-accent" : ""}`}
                        title="Change access level"
                      >
                        <option value="participant">Learner</option>
                        <option value="coordinator">Program Coordinator</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.client ? <Badge tone="accent"><Icons.Building2 className="h-3 w-3" /> {r.client}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(r)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground/70 hover:bg-secondary" title="Edit person">
                        <Icons.Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {r.status === "Invited" ? (
                        <button onClick={() => resend(r)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10" title="Resend credentials email">
                          <Icons.Send className="h-3.5 w-3.5" /> Resend
                        </button>
                      ) : (
                        <button onClick={() => resetPw(r)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10" title="Generate a new temporary password for this person">
                          <Icons.KeyRound className="h-3.5 w-3.5" /> Reset password
                        </button>
                      )}
                      <button onClick={() => remove(r.email)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)]">
                        <Icons.Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <EditPersonDialog
          member={editing}
          clientNames={clientNames}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onRemove={(em) => { setEditing(null); remove(em); }}
        />
      )}
    </div>
  );
}

// ---- Edit person dialog -------------------------------------------------
function EditPersonDialog({ member, clientNames, onClose, onSave, onRemove }: {
  member: Member;
  clientNames: string[];
  onClose: () => void;
  onSave: (m: Member) => void;
  onRemove: (email: string) => void;
}) {
  const [name, setName] = useState(member.name ?? "");
  const [role, setRole] = useState<Member["role"]>(member.role);
  const [client, setClient] = useState(member.client ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold">Edit person</p>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary" aria-label="Close"><Icons.X className="h-4 w-4" /></button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="modal-input" autoFocus />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
          <input value={member.email} disabled className="modal-input opacity-60" />
          <span className="mt-1 block text-[11px] text-muted-foreground">Email is the person's sign-in — it can't be changed here. Remove and re-invite to use a different address.</span>
        </label>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Access level</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="modal-input">
              <option value="participant">Learner</option>
              <option value="coordinator">Program Coordinator</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Client</span>
            <select value={client} onChange={(e) => setClient(e.target.value)} className="modal-input">
              <option value="">— None —</option>
              {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button onClick={() => onRemove(member.email)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)]">
            <Icons.Trash2 className="h-4 w-4" /> Remove
          </button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => onSave({ ...member, name: name.trim() || member.name, role, client: client || undefined })}>
              <Icons.Check className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
