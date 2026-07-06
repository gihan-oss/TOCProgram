"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { loadClients, primaryClient, type Client } from "@/lib/clients";
import { CLIENT } from "@/lib/mas";
import { cn } from "@/lib/utils";

// The co-brand lockup: the Amal & Company logo (constant everywhere) with the
// current client's logo beside it. Admins set the client logo in Clients. When
// no logo is uploaded we fall back to the client's name so the pairing is still
// clear. `invert` renders the white Amal logo for dark surfaces (e.g. login).
export function CoBrand({ className, invert = false }: { className?: string; invert?: boolean }) {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    let active = true;
    loadClients().then((cs) => { if (active) setClient(primaryClient(cs) ?? null); });
    return () => { active = false; };
  }, []);

  const name = client?.name ?? CLIENT.name;
  const logo = client?.logoUrl;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size="sm" invert={invert} />
      <span className={cn("h-6 w-px shrink-0", invert ? "bg-white/30" : "bg-border")} aria-hidden />
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={`${name} logo`} className="h-7 w-auto max-w-[128px] object-contain" />
      ) : (
        <span className={cn("whitespace-nowrap text-sm font-bold tracking-tight", invert ? "text-white" : "text-foreground")}>
          {name}
        </span>
      )}
    </div>
  );
}
