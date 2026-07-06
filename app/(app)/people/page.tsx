"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { loadModules } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import { isChatAvailable, listOrgPeople, type OrgPerson } from "@/lib/chat";

// The class directory: everyone in your organization, how far they've gotten
// through the course, and a button to message them privately. Staff see all
// organizations. Visibility is enforced server-side by org_people().
export default function PeoplePage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<OrgPerson[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const available = isChatAvailable();

  useEffect(() => {
    if (!user || !available) { setLoading(false); return; }
    let active = true;
    (async () => {
      const [folks, modules] = await Promise.all([listOrgPeople(), loadModules()]);
      if (!active) return;
      setPeople(folks);
      setTotalItems(effectiveModules(modules).reduce((s, m) => s + m.resources.length, 0));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.email, available]);

  const me = user?.email.toLowerCase() ?? "";
  const sorted = useMemo(
    () => [...people].sort((a, b) => (b.done_count - a.done_count) || a.name.localeCompare(b.name)),
    [people],
  );

  if (!available) {
    return (
      <div>
        <SectionTitle sub="See how far your group has come, and message each other.">People</SectionTitle>
        <EmptyHint>The people directory needs the live database (Supabase).</EmptyHint>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle sub="Your learning group — how far everyone has come. Cheer each other on with a private message.">
        People
      </SectionTitle>

      {loading ? (
        <div className="flex justify-center py-10"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : sorted.length === 0 ? (
        <EmptyHint>No one else here yet — people appear as your administrator invites them.</EmptyHint>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const isMe = p.email.toLowerCase() === me;
            const pct = totalItems > 0 ? Math.min(100, Math.round((p.done_count / totalItems) * 100)) : 0;
            const initials = (p.name || p.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
            return (
              <Card key={p.email} className="p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">{initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{p.name || p.email}</p>
                      {isMe && <Badge tone="accent">You</Badge>}
                      {p.member_role === "admin" && <Badge tone="muted"><Icons.ShieldCheck className="h-3 w-3" /> Staff</Badge>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-[hsl(var(--success))]" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                        {pct >= 100 ? <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]"><Icons.Trophy className="h-3.5 w-3.5" /> Finished!</span> : `${pct}% · ${p.done_count} item${p.done_count !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>
                  {!isMe && (
                    <Link href={`/messages?with=${encodeURIComponent(p.email)}`} className="shrink-0">
                      <Button size="sm" variant="outline"><Icons.MessageCircle className="h-4 w-4" /> Message</Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
