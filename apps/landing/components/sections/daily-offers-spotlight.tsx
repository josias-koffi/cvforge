import {
  ArrowRightIcon,
  GaugeIcon,
  LandmarkIcon,
  MousePointerClickIcon,
  SparklesIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { featurePath } from "@/lib/features"
import type { Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

/** One icon per point, in the dictionary's order: sources, score, apply. */
const POINT_ICONS: LucideIcon[] = [LandmarkIcon, GaugeIcon, MousePointerClickIcon]

/**
 * The daily offers and their AI ranking (E19), the feature no other part of
 * the home page tells — so it gets a section of its own (US-147).
 */
export function DailyOffersSpotlight({
  spotlight,
  locale,
}: {
  spotlight: LandingDictionary["spotlight"]
  locale: Locale
}) {
  return (
    <Section id="daily-offers" className="overflow-x-clip">
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <SparklesIcon className="size-4" strokeWidth={1.75} aria-hidden />
            {spotlight.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {spotlight.title}
          </h2>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">
            {spotlight.subtitle}
          </p>
          <ul className="mt-8 flex flex-col gap-5">
            {spotlight.points.map((point, index) => {
              const Icon = POINT_ICONS[index] ?? SparklesIcon

              return (
                <li key={point.title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-medium">{point.title}</h3>
                    <p className="mt-0.5 text-muted-foreground">{point.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button
              variant="spark"
              size="lg"
              className="h-11 px-5 text-base"
              asChild
            >
              <a href={LOGIN_PATH}>
                <ZapIcon strokeWidth={1.75} />
                {spotlight.cta}
              </a>
            </Button>
            <Link
              href={featurePath("daily_offers")(locale)}
              className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline"
            >
              {spotlight.learnMore}
              <ArrowRightIcon className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative pb-20 sm:pb-24">
          <div
            aria-hidden
            className="absolute inset-x-8 top-8 -z-10 h-3/4 rounded-full bg-spark/15 blur-3xl"
          />
          <BrowserFrame path="/offres-du-jour">
            <Screenshot
              name="offer-panel"
              alt={spotlight.screenshotAlt}
              sizes="(min-width: 1152px) 670px, 100vw"
            />
          </BrowserFrame>
          <div className="absolute bottom-0 -left-2 w-[78%] rounded-2xl border bg-card p-1.5 shadow-overlay sm:-left-8 lg:-left-16">
            <Screenshot
              name="offer-ai"
              alt={spotlight.detailAlt}
              sizes="(min-width: 1152px) 520px, 80vw"
              className="h-auto w-full rounded-xl"
            />
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
