import { cn } from "@/lib/utils";

// Amal & Company brand mark + wordmark.
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <svg viewBox="0 0 40 40" className="h-full w-full" role="img" aria-label="Amal & Company">
        <defs>
          <linearGradient id="amalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(243 75% 62%)" />
            <stop offset="100%" stopColor="hsl(199 89% 52%)" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="url(#amalGrad)" />
        {/* stylized 'A' formed by two ascending strokes = growth */}
        <path d="M14 28 L20 12 L26 28" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 22.5 L23.5 22.5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="20" cy="9" r="2.1" fill="white" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  subtitle = "Impact Portal",
  invert = false,
  size = "md",
}: {
  className?: string;
  subtitle?: string | null;
  invert?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const title = size === "lg" ? "text-xl" : "text-base";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={mark} />
      <span className="leading-tight">
        <span className={cn("block font-extrabold tracking-tight", title, invert ? "text-white" : "text-foreground")}>
          Amal <span className="font-medium opacity-70">&amp;</span> Company
        </span>
        {subtitle && (
          <span className={cn("block text-[11px] font-medium", invert ? "text-white/70" : "text-muted-foreground")}>{subtitle}</span>
        )}
      </span>
    </span>
  );
}
