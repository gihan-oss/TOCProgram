"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle, Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ADMIN_EMAILS, LEARNER_EMAILS } from "@/lib/access";
import { addNotification, sendEmail, listMembers, saveMember, removeMember, type Member } from "@/lib/store";
import { inviteEmail, genTempPassword } from "@/lib/email-templates";
import { MAS } from "@/lib/mas";

const nameFromEmail = (email: string) =>
  email.split("@")[0].split(/[.\-_]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");

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

export default function AccessPage() {
  const [rows, setRows] = useState<Member[]>(seeds);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "participant">("participant");
  const toast = useToast();

  // Load persisted members so invitations survive sign-out / reload.
  useEffect(() => {
    let active = true;
    listMembers().then((saved) => {
      if (active) setRows(mergeMembers(saved, seeds));
    });
    return () => { active = false; };
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    const target = email.toLowerCase();
    const label = role === "admin" ? "Administrator" : "Learner";
    const member: Member = { email: target, name: nameFromEmail(target), role, status: "Invited", temp_password: genTempPassword() };
    setRows((r) => mergeMembers([member], r));
    setEmail("");
    // persist so the invite survives sign-out / reload
    await saveMember(member);
    // queue an in-app notification they'll see on first sign-in
    await addNotification(target, `You've been invited as ${label}`, `Welcome to the ${MAS.partner} Impact Portal.`);
    const { subject, html } = inviteEmail({
      name: member.name,
      email: target,
      password: member.temp_password,
      role,
      loginUrl: "https://toc-program.vercel.app/login",
    });
    const res = await sendEmail(target, subject, html);
    toast(
      res.ok
        ? (res.demo
            ? `Invite saved — email simulated. Temp password: ${member.temp_password}`
            : `Invitation sent ✨ Temp password: ${member.temp_password}`)
        : `Invite saved — email failed: ${res.error ?? "unknown error"}`,
      res.ok ? "success" : "error",
    );
  }
  async function remove(target: string) {
    setRows((r) => r.filter((x) => x.email !== target));
    await removeMember(target);
  }

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icons.ArrowLeft className="h-4 w-4" /> Admin Console
      </Link>
      <SectionTitle sub="Access is restricted. Only people you invite can sign in — as an administrator or a learner.">
        People &amp; Access
      </SectionTitle>

      {/* Invite */}
      <Card className="mb-6 p-5">
        <p className="mb-3 font-semibold">Invite someone</p>
        <form onSubmit={invite} className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border bg-background px-3 py-2.5">
            <Icons.Mail className="h-4 w-4 text-muted-foreground" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@organization.org" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none">
            <option value="participant">Learner</option>
            <option value="admin">Administrator</option>
          </select>
          <Button type="submit" size="sm"><Icons.Send className="h-4 w-4" /> Send invite</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Invitations are saved automatically (Supabase when configured, otherwise this browser) and stay put across sign-out. Each person gets a cute welcome email with their login details laid out in order.</p>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Access level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email} className="border-b">
                  <td className="px-4 py-3 font-medium">
                    {r.email}
                    {r.status === "Invited" && r.temp_password && (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        temp password: <code className="rounded bg-muted px-1 font-mono">{r.temp_password}</code>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.role === "admin" ? "accent" : "muted"}>
                      {r.role === "admin" ? <><Icons.ShieldCheck className="h-3 w-3" /> Administrator</> : <><Icons.GraduationCap className="h-3 w-3" /> Learner</>}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><Badge tone={r.status === "Active" ? "success" : "warning"}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.email)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)]">
                      <Icons.Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
