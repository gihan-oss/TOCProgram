"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { navFor, canAccess, homeFor } from "@/lib/nav";
import { ROLES, CURRENT_USER } from "@/lib/data";
import { useApp } from "./providers";
import { useAuth } from "./auth";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications";

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const { role, setRole, theme, toggleTheme } = useApp();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const displayName = user?.name || CURRENT_USER.name;
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restricted access: learners are locked to their assigned role; only
  // admins may switch the active view for previewing.
  // On sign-in, set the active view to the user's true role (forces learners
  // to their journey-scoped menu even if an old role was saved).
  useEffect(() => {
    if (user) setRole(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Enforce restricted access. Admins (true role) can reach anything — their
  // dropdown only changes the *preview*; learners are confined to their set.
  useEffect(() => {
    if (user && !canAccess(user.role, pathname) && !canAccess(role, pathname)) {
      router.replace(homeFor(role));
    }
  }, [role, pathname, user, router]);
  const items = navFor(role);
  const groups = Array.from(new Set(items.map((i) => i.group)));
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b px-5">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <Logo subtitle="Impact Portal" size="sm" />
          </Link>
        </div>

        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              {items
                .filter((i) => i.group === group)
                .map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b glass px-4 lg:px-6">
          <button className="rounded-lg p-2 hover:bg-secondary lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Icons.Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              role === "participant" ? (
                <button onClick={() => setRole("admin")} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/15">
                  <Icons.Eye className="h-4 w-4" /> Exit preview
                </button>
              ) : (
                <button onClick={() => setRole("participant")} className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-secondary">
                  <Icons.Eye className="h-4 w-4" /> View as participant
                </button>
              )
            )}

            <NotificationsBell />

            <button onClick={toggleTheme} className="rounded-lg border bg-background p-2 hover:bg-secondary" aria-label="Toggle theme">
              {theme === "dark" ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: `hsl(${CURRENT_USER.avatarColor})` }}>
                {initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-medium">{displayName}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
              </div>
            </div>

            <button onClick={() => signOut()} className="rounded-lg border bg-background p-2 hover:bg-secondary" aria-label="Sign out" title="Sign out">
              <Icons.LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {isAdmin && role === "participant" && (
          <div className="flex items-center justify-center gap-2 border-b bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
            <Icons.Eye className="h-3.5 w-3.5" /> You're previewing the participant experience.
            <button onClick={() => setRole("admin")} className="underline">Exit preview</button>
          </div>
        )}

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
