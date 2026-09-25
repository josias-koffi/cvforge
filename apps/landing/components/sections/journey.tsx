"use client"

import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import type { FeatureKey } from "@/content/feature-pages/types"
import type { LandingDictionary, ScreenshotName } from "@/content/types"
import { featurePath } from "@/lib/features"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** What each step shows, and the page telling it in full; in step order. */
const STEPS: { shot: ScreenshotName; path: string; feature?: FeatureKey }[] = [
  { shot: "daily-offers", path: "/offres-du-jour", feature: "daily_offers" },
  {
    shot: "cv-editor",
    path: "/candidatures/cv",
    feature: "tailored_documents",
  },
  { shot: "interview-report", path: "/entretiens/rapport", feature: "interview" },
  { shot: "candidatures", path: "/candidatures" },
]

/**
 * The search in four steps (US-147). A step is picked by click or keyboard;
 * every capture stays in the HTML, hidden, so its alt text is still read.
 */
export function Journey({
  journey,
  locale,
}: {
  journey: LandingDictionary["journey"]
  locale: Locale
}) {
  const [active, setActive] = useState(0)

  return (
    <Section id="how-it-works" className="border-y bg-card">
      <SectionHeading
        eyebrow={journey.eyebrow}
        title={journey.title}
        subtitle={journey.subtitle}
      />
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <ol className="flex flex-col gap-3">
          {journey.steps.map((step, index) => {
            const selected = index === active
            const feature = STEPS[index]?.feature

            return (
              <li key={step.label}>
                <div
                  className={cn(
                    "rounded-xl border bg-background transition-shadow duration-200 ease-spark",
                    selected
                      ? "border-primary/40 shadow-raised"
                      : "hover:shadow-surface"
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActive(index)}
                    className="flex w-full gap-4 rounded-xl p-5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="text-xs font-medium tracking-wide text-primary uppercase">
                        {step.label}
                      </span>
                      <span className="mt-1 block text-lg font-medium">
                        {step.title}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-muted-foreground",
                          !selected && "lg:line-clamp-1"
                        )}
                      >
                        {step.body}
                      </span>
                    </span>
                  </button>
                  {selected && feature ? (
                    <Link
                      href={featurePath(feature)(locale)}
                      className="-mt-2 ml-17 inline-flex items-center gap-1.5 pb-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {journey.learnMore}
                      <ArrowRightIcon className="size-4" strokeWidth={1.75} />
                    </Link>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
        <Reveal delay={0.1}>
          <BrowserFrame path={STEPS[active]!.path}>
            {journey.steps.map((step, index) => (
              <div
                key={step.label}
                className={cn(index !== active && "hidden")}
              >
                <Screenshot
                  name={STEPS[index]!.shot}
                  alt={step.alt}
                  sizes="(min-width: 1152px) 670px, 100vw"
                />
              </div>
            ))}
          </BrowserFrame>
        </Reveal>
      </div>
    </Section>
  )
}
