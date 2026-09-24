import Link from "next/link"
import { ChevronRightIcon, SearchIcon } from "lucide-react"
import type { MarketPageLink, PublicMarketPage } from "@cvforge/types"

import {
  MarketFigures,
  TensionGauge,
} from "@/components/job-market/job-market-figures"
import { JobMarketLeadCta } from "@/components/job-market/job-market-lead-cta"
import { Section } from "@/components/section"
import type { LandingDictionary } from "@/content/types"
import { format, type Locale } from "@/lib/i18n"
import { marketPagePath } from "@/lib/market-pages"

export type Crumb = { name: string; path: string }

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
        <nav aria-label={text.breadcrumbLabel}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1

              return (
                <li className="flex items-center gap-1" key={crumb.path}>
                  {last ? (
                    <span aria-current="page" className="text-foreground">
                      {crumb.name}
                    </span>
                  ) : (
                    <>
                      <Link className="hover:text-foreground hover:underline" href={crumb.path}>
                        {crumb.name}
                      </Link>
                      <ChevronRightIcon aria-hidden="true" className="size-3.5" />
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

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
          label={(link) => marketPageNames(link).department}
          links={page.neighbours}
          locale={locale}
          title={text.neighboursTitle}
        />
        <PageLinks
          id="market-other-jobs"
          label={(link) => link.romeLabel}
          links={page.otherJobs}
          locale={locale}
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

/** Links to other pages that exist; nothing at all when there are none. */
function PageLinks({
  id,
  title,
  links,
  label,
  locale,
}: {
  id: string
  title: string
  links: MarketPageLink[]
  label: (link: MarketPageLink) => string
  locale: Locale
}) {
  if (links.length === 0) return null

  return (
    <section aria-labelledby={id}>
      <h2 className="text-lg font-medium" id={id}>
        {title}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={`${link.romeCode}-${link.department}`}>
            <Link
              className="flex min-h-11 items-center rounded-lg border px-3 py-2 hover:bg-accent"
              href={marketPagePath(locale, link)}
            >
              {label(link)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
