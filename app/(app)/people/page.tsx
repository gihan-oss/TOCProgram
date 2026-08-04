"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { loadModules } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import { isChatAvailable, listOrgPeople, type OrgPerson } from "@/lib/chat";
import { characterFor, characterTint, journeyRank } from "@/lib/characters";

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
        <EmptyHint>The people directory needs the live database.</EmptyHint>
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
            const rank = journeyRank(pct);
            return (
              <Card key={p.email} className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3.5">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.name || p.email} className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${characterTint(p.email)}`} title="Pick a photo in My Profile">
                      {characterFor(p.email)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{p.name || p.email}</p>
                      {isMe && <Badge tone="accent">You</Badge>}
                      {p.member_role === "admin" && <Badge tone="muted"><Icons.ShieldCheck className="h-3 w-3" /> Staff</Badge>}
                      <Badge tone={pct >= 100 ? "accent" : "muted"}>{rank.emoji} {rank.label}</Badge>
                    </div>
                    {(p.role_type || p.department) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[p.role_type, p.department].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="h-2.5 w-full max-w-[220px] overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? "bg-primary" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                        {pct >= 100 ? <span className="inline-flex items-center gap-1 text-primary"><Icons.Trophy className="h-3.5 w-3.5" /> Finished!</span> : `${pct}% · ${p.done_count} item${p.done_count !== 1 ? "s" : ""}`}
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
