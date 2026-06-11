"use client";

import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

// ---- Modern button: generous padding, soft radius, subtle motion ----
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
  outline: "border bg-card hover:bg-secondary",
  ghost: "hover:bg-secondary",
  danger: "bg-[hsl(var(--danger))] text-white shadow-sm hover:opacity-90",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-lg gap-1.5",
  md: "h-11 px-6 text-sm rounded-xl gap-2",
  lg: "h-13 px-8 text-base rounded-xl gap-2.5 py-3.5",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold tracking-tight transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- Photo with graceful gradient fallback (never renders broken) ----
export function Photo({
  src,
  alt,
  className,
  gradient = "from-primary/30 to-accent/30",
}: {
  src: string;
  alt: string;
  className?: string;
  gradient?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br", gradient, className)}>
        <Icons.Image className="h-8 w-8 text-white/70" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("object-cover", className)} />;
}

// ---- Floating decorative icons layer ----
export function FloatingIcons({ icons }: { icons?: { name: string; className: string; delay?: string }[] }) {
  const set =
    icons ?? [
      { name: "HeartHandshake", className: "left-[6%] top-[18%] text-accent/40 h-10 w-10", delay: "0s" },
      { name: "Sprout", className: "left-[14%] bottom-[16%] text-[hsl(var(--success))]/40 h-9 w-9", delay: "1.2s" },
      { name: "Target", className: "right-[10%] top-[24%] text-primary/30 h-12 w-12", delay: "0.6s" },
      { name: "Globe2", className: "right-[16%] bottom-[20%] text-accent/35 h-10 w-10", delay: "1.8s" },
      { name: "TrendingUp", className: "left-[44%] top-[8%] text-[hsl(var(--warning))]/40 h-8 w-8", delay: "2.4s" },
      { name: "BookOpen", className: "right-[40%] bottom-[10%] text-primary/30 h-9 w-9", delay: "0.9s" },
    ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {set.map((it, i) => {
        const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[it.name] ?? Icons.Circle;
        return (
          <div key={i} className={cn("absolute animate-float", it.className)} style={{ animationDelay: it.delay }}>
            <Cmp className="h-full w-full" strokeWidth={1.5} />
          </div>
        );
      })}
    </div>
  );
}

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
