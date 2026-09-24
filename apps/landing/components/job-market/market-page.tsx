import Link from "next/link"
import { SearchIcon } from "lucide-react"
import type { MarketPageLink, PublicMarketPage } from "@cvforge/types"

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import {
  MarketFigures,
  TensionGauge,
} from "@/components/job-market/job-market-figures"
import { JobMarketLeadCta } from "@/components/job-market/job-market-lead-cta"
import { PageLinks } from "@/components/page-links"
import { Section } from "@/components/section"
import type { LandingDictionary } from "@/content/types"
import { format, type Locale } from "@/lib/i18n"
import { marketPagePath } from "@/lib/market-pages"

/** "Comptable" and "Loire-Atlantique (44)", as every template names them. */
export function marketPageNames(page: MarketPageLink) {
  return {
    department: `${page.departmentLabel} (${page.department})`,
    job: page.romeLabel,
  }
}

/** The sentence under the title, written from the figures alone. */
export function marketPageSummary(
  page: PublicMarketPage,
  text: LandingDictionary["jobMarket"]["page"],
  locale: Locale
) {
  const number = new Intl.NumberFormat(locale)
  const { tension, offersYear, jobseekers } = page.stats
  const parts = [
    format(text.summary, {
      level: tension?.value ?? "",
      offers: number.format(offersYear?.value ?? 0),
      period: tension?.period ?? "",
    }),
  ]

  // Neighbouring departments are read without job seekers: the sentence
  // stops rather than say "0".
  if (jobseekers) {
    parts.push(
      format(text.summaryJobseekers, {
        count: number.format(jobseekers.value),
        period: jobseekers.period,
      })
    )
  }

  return parts.join(" ")
}

/**
 * The page of one job in one department (US-138): the radar's figures, their
 * sources, the way to the morning e-mail, and links to the pages around it.
 */
export function MarketPage({
  page,
  dictionary,
  errors,
  locale,
  crumbs,
  toolPath,
}: {
  page: PublicMarketPage
  dictionary: LandingDictionary["jobMarket"]
  errors: LandingDictionary["ats"]
  locale: Locale
  crumbs: Crumb[]
  toolPath: string
}) {
  const text = dictionary.page
  const result = dictionary.result

  return (
    <Section className="py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Breadcrumbs crumbs={crumbs} label={text.breadcrumbLabel} />

        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {format(text.title, marketPageNames(page))}
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            {marketPageSummary(page, text, locale)}
          </p>
        </header>

        <section
          aria-labelledby="market-figures"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-raised md:p-8"
        >
          <h2 className="text-xl font-medium" id="market-figures">
            {text.figuresTitle}
          </h2>
          <TensionGauge dictionary={result} tension={page.stats.tension} />
          <MarketFigures
            dictionary={result}
            locale={locale}
            salaryMinSample={page.salaryMinSample}
            stats={page.stats}
          />
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>{result.sources.market}</p>
            <p>{result.sources.salary}</p>
            <p>
              {format(result.refreshed, {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "long",
                  timeZone: "Europe/Paris",
                }).format(new Date(page.refreshedAt)),
              })}
            </p>
          </div>
        </section>

        {page.leadAppellationCode ? (
          <JobMarketLeadCta
            appellationCode={page.leadAppellationCode}
            department={page.department}
            dictionary={dictionary}
            errors={errors}
          />
        ) : null}

        {page.appellations.length > 0 ? (
          <section aria-labelledby="market-appellations">
            <h2 className="text-lg font-medium" id="market-appellations">
              {text.appellationsTitle}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {page.appellations.map((appellation) => (
                <li
                  className="rounded-full border px-2.5 py-0.5 text-sm text-foreground"
                  key={appellation.code}
                >
                  {appellation.libelle}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <PageLinks
          id="market-neighbours"
          links={page.neighbours.map((link) => ({
            href: marketPagePath(locale, link),
            label: marketPageNames(link).department,
          }))}
          title={text.neighboursTitle}
        />
        <PageLinks
          id="market-other-jobs"
          links={page.otherJobs.map((link) => ({
            href: marketPagePath(locale, link),
            label: link.romeLabel,
          }))}
          title={text.otherJobsTitle}
        />

        <Link
          className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-primary hover:underline"
          href={toolPath}
        >
          <SearchIcon aria-hidden="true" className="size-4" />
          {text.toolLink}
        </Link>
      </div>
    </Section>
  )
}
