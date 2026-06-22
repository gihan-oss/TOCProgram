import { Sparkles } from "lucide-react";
import { FloatingIcons } from "@/components/ui";
import { Logo } from "@/components/logo";
import { PortalDoor } from "@/components/portal-door";
import { TransformationMap } from "@/components/transformation-map";
import { MAS } from "@/lib/mas";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* brand accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

      <header className="border-b glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo size="md" />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:block">
            Scaling Social Impact
          </span>
        </div>
      </header>

      {/* Hero: one message, one button, the picture underneath */}
      <main className="relative flex-1 overflow-hidden">
        <div className="mesh absolute inset-0" />
        <FloatingIcons />
        <section className="relative mx-auto max-w-4xl px-6 py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> {MAS.org} · {MAS.vision}
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Our home for the{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">whole transformation</span>
            {" "}— not just our Theory of Change
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            From our vision and six areas of focus to learning, implementation, measurement and impact —
            this is where the entire work of our chapter comes together. The Theory of Change is one tool
            inside it, not the whole story.
          </p>

          {/* The single, branded call to action — opens the portal like a door */}
          <div className="mt-9 flex flex-col items-center gap-3 animate-fade-up">
            <PortalDoor href="/login" />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              An Amal &amp; Company platform
            </p>
          </div>

          {/* The picture: a visual graphic of the comprehensiveness of the work */}
          <div className="mt-12 text-left animate-fade-up">
            <TransformationMap />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-7 text-center">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            {MAS.orgFull} · {MAS.vision} · in partnership with {MAS.partner}
          </p>
        </div>
      </footer>
    </div>
  );
}
