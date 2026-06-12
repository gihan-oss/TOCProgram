"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { useAuth } from "./auth";
import { listNotifications, markAllRead, type AppNotification } from "@/lib/store";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    if (user) setItems(await listNotifications(user.email));
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000); // light polling
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await refresh();
    } else if (user && unread > 0) {
      await markAllRead(user.email);
      await refresh();
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-lg border bg-background p-2 hover:bg-secondary" aria-label="Notifications">
        <Icons.Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--danger))] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <span className="text-xs text-muted-foreground">{unread} unread</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nothing yet — updates about your programs and tasks will appear here.</p>
            )}
            {items.map((n) => (
              <div key={n.id} className={`border-b px-4 py-3 last:border-0 ${n.read ? "" : "bg-accent/5"}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
