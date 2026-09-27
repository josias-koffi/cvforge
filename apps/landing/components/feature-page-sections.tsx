import { ArrowRightIcon, CheckIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import {
  BrowserFrame,
  isCloseUp,
  Screenshot,
  screenshotSize,
} from "@/components/screenshot"
import { Section, SectionHeading } from "@/components/section"
import type {
  FeaturePageDictionary,
  FeaturePagesDictionary,
} from "@/content/feature-pages/types"
import type { LandingDictionary, ScreenshotName } from "@/content/types"
import { type FeaturePage, featurePages } from "@/lib/features"
import { homePath, type Locale } from "@/lib/i18n"
import { creditCost } from "@/lib/pricing"
import { freeTools } from "@/lib/tools"
import { cn } from "@/lib/utils"

/**
 * A capture sized for a column: full screens keep their browser chrome, a
 * close-up sits on a soft card so it reads as a zoom, not a cropped window.
 */
export function FeatureShot({
  name,
  alt,
  path,
  sizes = "(min-width: 1024px) 560px, 100vw",
  className,
}: {
  name: ScreenshotName
  alt: string
  path: string
  sizes?: string
  className?: string
}) {
  if (isCloseUp(name)) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-muted/40 p-2 shadow-raised sm:p-3",
          className
        )}
      >
        {/* A tall panel is cut at the height of the text beside it: the
            top holds what it says. */}
        <Screenshot
          name={name}
          alt={alt}
          sizes={sizes}
          className="h-auto max-h-[36rem] w-full rounded-xl object-cover object-top"
        />
      </div>
    )
  }

  return (
    <BrowserFrame path={path} className={className}>
      <Screenshot name={name} alt={alt} sizes={sizes} />
    </BrowserFrame>
  )
}

/**
 * A close-up this much wider than tall only reads at full width: in a half
 * column its text shrinks below legibility.
 */
const WIDE_RATIO = 1.9

function isWide(name: ScreenshotName) {
  const { width, height } = screenshotSize(name)

  return width / height >= WIDE_RATIO
}

/**
 * The page's text blocks, each beside its capture, sides alternating — or
 * above it, when the capture is a wide close-up.
 */
export function FeatureBlocks({
  feature,
  page,
}: {
  feature: FeaturePage
  page: FeaturePageDictionary
}) {
  let side = 0

  return (
    <Section className="py-16 md:py-24">
      <div className="flex flex-col gap-20 md:gap-28">
        {page.blocks.map((block, index) => {
          const name = feature.blocks[index]!
          const wide = isWide(name)
          const flipped = !wide && side++ % 2 === 1

          return (
            <article
              key={block.title}
              className={cn(
                "grid items-center gap-10",
                !wide && "lg:grid-cols-2 lg:gap-16"
              )}
            >
              <Reveal
                className={cn(
                  flipped && "lg:order-2",
                  wide && "mx-auto max-w-3xl text-center"
                )}
              >
                <p className="text-sm font-medium text-primary">
                  {block.eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                  {block.title}
                </h2>
                <p className="mt-4 text-lg text-pretty text-muted-foreground">
                  {block.body}
                </p>
                <ul
                  className={cn(
                    "mt-6 flex flex-col gap-3",
                    wide && "sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8"
                  )}
                >
                  {block.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-left"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <CheckIcon
                          className="size-3.5"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.1} className="relative">
                <div
                  aria-hidden
                  className="absolute inset-6 -z-10 rounded-full bg-primary/15 blur-3xl"
                />
                <FeatureShot
                  name={name}
                  alt={block.alt}
                  path={feature.hero.path}
                  sizes={
                    wide
                      ? "(min-width: 1152px) 1152px, 100vw"
                      : "(min-width: 1024px) 560px, 100vw"
                  }
                />
              </Reveal>
            </article>
          )
        })}
      </div>
    </Section>
  )
}

/** What sets the feature apart, then what it costs. */
export function FeatureDifference({
  feature,
  page,
  common,
  pricing,
  locale,
}: {
  feature: FeaturePage
  page: FeaturePageDictionary
  common: FeaturePagesDictionary
  pricing: LandingDictionary["pricing"]
  locale: Locale
}) {
  return (
    <Section className="border-y bg-card">
      <SectionHeading
        eyebrow={page.difference.eyebrow}
        title={page.difference.title}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {page.difference.items.map((item, index) => (
          <Reveal
            key={item.title}
            delay={index * 0.06}
            className="rounded-2xl border bg-background p-6"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
              <SparklesIcon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-medium">{item.title}</h3>
            <p className="mt-1 text-muted-foreground">{item.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mx-auto mt-14 max-w-2xl">
        <h3 className="text-center text-lg font-medium">
          {page.pricing.title}
        </h3>
        <p className="mt-2 text-center text-muted-foreground">
          {page.pricing.body}
        </p>
        {feature.actions.length > 0 ? (
          <dl className="mt-5 divide-y rounded-xl border bg-background">
            {feature.actions.map((action) => (
              <div
                key={action}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <dt className="text-muted-foreground">
                  {pricing.actions[action]}
                </dt>
                <dd className="font-mono text-sm whitespace-nowrap">
                  {creditCost(action)}{" "}
                  {creditCost(action) === 1
                    ? common.pricingCreditUnit.one
                    : common.pricingCreditUnit.other}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mx-auto mt-5 w-fit rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm">
            {common.pricingFree}
          </p>
        )}
        <p className="mt-4 text-center">
          <Link
            href={homePath(locale, "pricing")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {pricing.eyebrow}
            <ArrowRightIcon className="size-4" strokeWidth={1.75} />
          </Link>
        </p>
      </Reveal>
    </Section>
  )
}

/** The other feature pages, then the free tools that lead into this one. */
export function FeatureRelated({
  feature,
  common,
  tools,
  locale,
}: {
  feature: FeaturePage
  common: FeaturePagesDictionary
  tools: LandingDictionary["tools"]
  locale: Locale
}) {
  const others = featurePages.filter(({ key }) => key !== feature.key)
  const linkedTools = freeTools.filter(({ key }) =>
    feature.tools.includes(key)
  )

  return (
    <Section className="py-16 md:py-24">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {common.related.title}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {others.map(({ key, path, icon: Icon }, index) => (
          <Reveal key={key} delay={index * 0.06}>
            <Link
              href={path(locale)}
              className="group flex h-full flex-col rounded-2xl border bg-card p-6 shadow-surface transition-shadow duration-200 ease-spark hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary transition-transform duration-200 ease-spark group-hover:-rotate-6">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="mt-4 text-lg font-medium">
                {common.pages[key].card.name}
              </span>
              <span className="mt-1 text-muted-foreground">
                {common.pages[key].card.description}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {common.learnMore}
                <ArrowRightIcon
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
      {linkedTools.length > 0 ? (
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">{common.related.tools}</p>
          {linkedTools.map(({ key, path, icon: Icon }) => (
            <Link
              key={key}
              href={path(locale)}
              className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              {tools.items[key].name}
            </Link>
          ))}
        </div>
      ) : null}
    </Section>
  )
}
