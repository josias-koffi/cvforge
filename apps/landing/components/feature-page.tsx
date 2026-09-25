import { ZapIcon } from "lucide-react"

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import {
  FeatureBlocks,
  FeatureDifference,
  FeatureRelated,
} from "@/components/feature-page-sections"
import { BrowserFrame, Screenshot } from "@/components/screenshot"
import { Cta } from "@/components/sections/cta"
import { Faq } from "@/components/sections/faq"
import { HeroBackdrop } from "@/components/sections/hero"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import type { FeaturePage } from "@/lib/features"
import { homePath, type Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

/** Where a feature page sits: the home page, then the page itself. */
export function featureCrumbs(
  locale: Locale,
  feature: FeaturePage,
  dict: Pick<LandingDictionary, "featurePages">
): Crumb[] {
  return [
    { name: "CVSpark", path: homePath(locale) },
    {
      name: dict.featurePages.pages[feature.key].card.name,
      path: feature.path(locale),
    },
  ]
}

/**
 * One product feature told in full (US-142): a hero with the app, the blocks
 * that show it working, what sets it apart and what it costs, its questions,
 * and the way on to the rest of the product.
 */
export function FeaturePageView({
  locale,
  feature,
  dict,
}: {
  locale: Locale
  feature: FeaturePage
  dict: LandingDictionary
}) {
  const common = dict.featurePages
  const page = common.pages[feature.key]
  const Icon = feature.icon

  return (
    <>
      <section className="relative isolate overflow-hidden pt-10 md:pt-16">
        <HeroBackdrop />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6">
          <div className="self-start rise-in">
            <Breadcrumbs
              crumbs={featureCrumbs(locale, feature, dict)}
              label={common.breadcrumbLabel}
            />
          </div>

          <p
            className="mt-10 inline-flex rise-in items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-surface"
            style={{ "--stagger": 0 } as React.CSSProperties}
          >
            <Icon className="size-3.5 text-primary" strokeWidth={1.75} />
            {page.eyebrow}
          </p>

          <h1
            className="mt-6 max-w-4xl rise-in text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
            style={{ "--stagger": 1 } as React.CSSProperties}
          >
            {page.title} <span className="text-primary">{page.titleAccent}</span>
          </h1>

          <p
            className="mt-6 max-w-2xl rise-in text-lg text-pretty text-muted-foreground md:text-xl"
            style={{ "--stagger": 2 } as React.CSSProperties}
          >
            {page.subtitle}
          </p>

          <div
            className="mt-8 rise-in"
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
                {page.primaryCta}
              </a>
            </Button>
          </div>

          <dl
            className="mt-10 grid w-full max-w-3xl rise-in grid-cols-3 divide-x rounded-2xl border bg-card/80 shadow-surface backdrop-blur"
            style={{ "--stagger": 4 } as React.CSSProperties}
          >
            {page.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse gap-1 px-3 py-4 sm:px-6"
              >
                <dt className="text-xs text-pretty text-muted-foreground sm:text-sm">
                  {stat.label}
                </dt>
                <dd className="text-lg font-semibold tracking-tight sm:text-2xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div
            className="relative mt-14 w-full rise-in md:mt-16"
            style={{ "--stagger": 5 } as React.CSSProperties}
          >
            <div
              aria-hidden
              className="absolute inset-x-10 -top-10 -z-10 h-2/3 rounded-full bg-primary/20 blur-3xl"
            />
            <BrowserFrame path={feature.hero.path}>
              <Screenshot
                name={feature.hero.name}
                alt={page.heroAlt}
                priority
              />
              <BorderBeam
                size={220}
                duration={9}
                borderWidth={1.5}
                colorFrom="var(--primary)"
                colorTo="var(--spark)"
              />
            </BrowserFrame>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-background to-transparent"
            />
          </div>
        </div>
      </section>

      <FeatureBlocks feature={feature} page={page} />
      <FeatureDifference
        feature={feature}
        page={page}
        common={common}
        pricing={dict.pricing}
        locale={locale}
      />
      <Faq
        faq={{
          eyebrow: page.eyebrow,
          title: page.faq.title,
          subtitle: "",
          items: page.faq.items,
        }}
        locale={locale}
      />
      <FeatureRelated
        feature={feature}
        common={common}
        tools={dict.tools}
        locale={locale}
      />
      <Cta
        cta={{
          ...common.cta,
          atsPrompt: dict.cta.atsPrompt,
          atsLink: dict.cta.atsLink,
        }}
        locale={locale}
      />
    </>
  )
}
