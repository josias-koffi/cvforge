import { CheckIcon } from "lucide-react"
import { CREDIT_PACK_PRO } from "@cvforge/types"

import { Reveal } from "@/components/reveal"
import { Section, SectionHeading } from "@/components/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { format, type Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"
import {
  CREDITS_PER_APPLICATION,
  creditCost,
  formatNumber,
  getPackSummaries,
  pricedActions,
  type PackSummary,
} from "@/lib/pricing"
import { cn } from "@/lib/utils"

export function Pricing({
  locale,
  pricing,
}: {
  locale: Locale
  pricing: LandingDictionary["pricing"]
}) {
  const packs = getPackSummaries(locale)

  return (
    <Section id="pricing" className="border-y bg-card">
      <SectionHeading
        eyebrow={pricing.eyebrow}
        title={pricing.title}
        subtitle={pricing.subtitle}
      />
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {packs.map((pack, index) => (
          <Reveal key={pack.id} delay={index * 0.08}>
            <PackCard
              pack={pack}
              locale={locale}
              pricing={pricing}
              featured={pack.id === CREDIT_PACK_PRO}
            />
          </Reveal>
        ))}
      </div>

      <Reveal className="mx-auto mt-12 max-w-2xl">
        <h3 className="text-center text-lg font-medium">
          {pricing.costsTitle}
        </h3>
        <dl className="mt-4 divide-y rounded-xl border bg-background">
          {pricedActions.map((action) => (
            <div
              key={action}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <dt className="text-muted-foreground">
                {pricing.actions[action]}
              </dt>
              <dd className="font-mono text-sm whitespace-nowrap">
                {creditCost(action)} {pricing.creditUnit}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {format(pricing.costsNote, { credits: CREDITS_PER_APPLICATION })}
        </p>
      </Reveal>
    </Section>
  )
}

function PackCard({
  pack,
  locale,
  pricing,
  featured,
}: {
  pack: PackSummary
  locale: Locale
  pricing: LandingDictionary["pricing"]
  featured: boolean
}) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-background p-8",
        featured
          ? "border-primary shadow-overlay ring-1 ring-primary"
          : "shadow-surface"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{pack.label}</h3>
        {featured ? <Badge>{pricing.popular}</Badge> : null}
      </div>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{pack.price}</p>
      <p className="mt-2 text-foreground">
        {format(pricing.creditsLabel, {
          credits: formatNumber(pack.credits, locale),
        })}
      </p>
      <p className="text-sm text-muted-foreground">
        {format(pricing.applicationsLabel, { count: pack.applications })}
      </p>
      <ul className="my-8 flex flex-col gap-2.5 text-sm">
        {pricing.perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2">
            <CheckIcon
              className="size-4 shrink-0 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            {perk}
          </li>
        ))}
      </ul>
      <Button
        variant={featured ? "default" : "outline"}
        size="lg"
        className="mt-auto h-11 text-base"
        asChild
      >
        <a href={LOGIN_PATH}>{format(pricing.buy, { pack: pack.label })}</a>
      </Button>
    </article>
  )
}
