import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "accent" | "muted";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
    warning: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
    danger: "bg-[hsl(var(--danger)/0.15)] text-[hsl(var(--danger))]",
    accent: "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Progress({ value, className, tone = "accent" }: { value: number; className?: string; tone?: "accent" | "success" | "warning" | "danger" }) {
  const colors: Record<string, string> = {
    accent: "bg-accent",
    success: "bg-[hsl(var(--success))]",
    warning: "bg-[hsl(var(--warning))]",
    danger: "bg-[hsl(var(--danger))]",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-[hsl(var(--success))]" : tone === "warning" ? "text-[hsl(var(--warning))]" : tone === "danger" ? "text-[hsl(var(--danger))]" : "text-foreground";
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tracking-tight", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function TrafficDot({ status, className }: { status: "green" | "yellow" | "red"; className?: string }) {
  const map = { green: "bg-[hsl(var(--success))]", yellow: "bg-[hsl(var(--warning))]", red: "bg-[hsl(var(--danger))]" };
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", map[status], className)} />;
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
