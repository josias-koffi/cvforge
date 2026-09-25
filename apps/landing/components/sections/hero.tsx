import { ArrowRightIcon, CheckIcon, SparklesIcon, ZapIcon } from "lucide-react"

import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import type { LandingDictionary, ScreenshotName } from "@/content/types"
import { atsPath } from "@/lib/ats"
import type { Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"
import { cn } from "@/lib/utils"

export function Hero({
  hero,
  locale,
}: {
  hero: LandingDictionary["hero"]
  locale: Locale
}) {
  return (
    <section className="relative isolate overflow-hidden pt-16 md:pt-24">
      <HeroBackdrop />

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6">
        <p
          className="inline-flex rise-in items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-surface"
          style={{ "--stagger": 0 } as React.CSSProperties}
        >
          <SparklesIcon className="size-3.5 text-spark" strokeWidth={1.75} />
          {hero.badge}
        </p>

        <h1
          className="mt-6 max-w-4xl rise-in text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          style={{ "--stagger": 1 } as React.CSSProperties}
        >
          {hero.title} <span className="text-primary">{hero.titleAccent}</span>
        </h1>

        <p
          className="mt-6 max-w-2xl rise-in text-lg text-pretty text-muted-foreground md:text-xl"
          style={{ "--stagger": 2 } as React.CSSProperties}
        >
          {hero.subtitle}
        </p>

        <div
          className="mt-8 flex w-full rise-in flex-col justify-center gap-3 sm:w-auto sm:flex-row"
          style={{ "--stagger": 3 } as React.CSSProperties}
        >
          <Button
            variant="spark"
            size="lg"
            className="h-11 px-5 text-base"
            asChild
          >
            <a href={LOGIN_PATH}>
              <ZapIcon strokeWidth={1.75} />
              {hero.primaryCta}
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-5 text-base"
            asChild
          >
            <a href="#how-it-works">
              {hero.secondaryCta}
              <ArrowRightIcon strokeWidth={1.75} />
            </a>
          </Button>
        </div>

        {/* A line, not a third button: the hero keeps one main action. */}
        <p
          className="mt-4 rise-in text-sm text-muted-foreground"
          style={{ "--stagger": 3 } as React.CSSProperties}
        >
          {hero.atsPrompt}{" "}
          <a
            className="rounded-sm font-medium text-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            href={atsPath(locale)}
          >
            {hero.atsLink}
          </a>
        </p>

        <ul
          className="mt-6 flex rise-in flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          style={{ "--stagger": 4 } as React.CSSProperties}
        >
          {hero.highlights.map((highlight) => (
            <li key={highlight} className="flex items-center gap-1.5">
              <CheckIcon className="size-4 text-success" strokeWidth={1.75} />
              {highlight}
            </li>
          ))}
        </ul>

        <div
          className="relative mt-14 w-full rise-in md:mt-20"
          style={{ "--stagger": 5 } as React.CSSProperties}
        >
          <div
            aria-hidden
            className="absolute inset-x-10 -top-10 -z-10 h-2/3 rounded-full bg-primary/20 blur-3xl"
          />
          <BrowserFrame path="/offres-du-jour">
            <Screenshot name="daily-offers" alt={hero.screenshotAlt} priority />
            <BorderBeam
              size={220}
              duration={9}
              borderWidth={1.5}
              colorFrom="var(--primary)"
              colorTo="var(--spark)"
            />
          </BrowserFrame>
          {/* A close-up floating over the capture: the AI's reason for the
              first offer. Decorative — the capture's alt text already says
              what the page shows. */}
          <FloatingShot
            name="offer-ai"
            className="-right-4 bottom-[14%] w-[48%] rotate-1 lg:-right-12"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background to-transparent"
          />
        </div>
      </div>
    </section>
  )
}

function FloatingShot({
  name,
  className,
}: {
  name: ScreenshotName
  className: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-10 hidden rounded-2xl border bg-card p-1.5 shadow-overlay md:block",
        className
      )}
    >
      <div
        className="animate-float"
        style={{ animationDuration: "6s" }}
      >
        <Screenshot
          name={name}
          alt=""
          sizes="(min-width: 1152px) 520px, 45vw"
          className="h-auto w-full rounded-xl"
        />
      </div>
    </div>
  )
}

/** Faint grid fading out from the top, behind the hero copy. */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_50%_at_50%_0%,#000_40%,transparent_100%)] bg-size-[48px_48px] opacity-60"
    />
  )
}
