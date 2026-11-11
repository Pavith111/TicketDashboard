import { Clock3, Hash, ShieldCheck, UserRoundX } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/public/reveal";
import { TicketForm } from "@/components/public/ticket-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getPublicLookups } from "@/lib/data/lookups";

export default async function SupportPortalPage() {
  const lookups = await getPublicLookups();

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Quiet grid texture behind the hero only. */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo label="IT Support" />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pt-14 pb-20 sm:px-6 sm:pt-20">
        <section className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground shadow-[var(--shadow-soft)]">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              IT SUPPORT PORTAL
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">
              How can we help you?
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-5 max-w-lg text-base text-pretty text-muted-foreground sm:text-lg">
              Report a technical issue and our IT support team will assist you.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <UserRoundX className="size-4" strokeWidth={1.75} /> No account needed
              </li>
              <li className="flex items-center gap-1.5">
                <Hash className="size-4" strokeWidth={1.75} /> You get a ticket number
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-4" strokeWidth={1.75} /> Seen only by IT staff
              </li>
            </ul>
          </Reveal>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:gap-10">
          <Reveal delay={0.22} className="min-w-0">
            <TicketForm lookups={lookups} />
          </Reveal>

          <Reveal delay={0.3}>
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
              <div className="surface p-5">
                <h2 className="text-sm font-semibold">Before you submit</h2>
                <ul className="mt-4 flex flex-col gap-3.5 text-[13px] leading-relaxed text-muted-foreground">
                  {[
                    "Restart the device. It solves more problems than you'd expect.",
                    "Write down any error message, or take a photo of the screen.",
                    "Check whether colleagues nearby have the same problem.",
                    "Add the room or lab so a technician can find the device.",
                  ].map((tip, i) => (
                    <li key={tip} className="flex gap-3">
                      <span className="mt-px font-mono text-[11px] text-foreground/70">0{i + 1}</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surface flex gap-3 p-5">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Urgent outage?</span> Mark the request as{" "}
                  <span className="font-medium text-foreground">Critical</span> so it goes to the top of the queue.
                </p>
              </div>
            </aside>
          </Reveal>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© Zuse IT Support. All rights reserved.</span>
          <span>IT operations for Lyceum International School, Panadura</span>
        </div>
      </footer>
    </div>
  );
}
