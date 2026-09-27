import Link from "next/link"
import { MapPinIcon, SearchIcon } from "lucide-react"
import { headcountLabel, type PublicCompanyPage } from "@cvforge/types"

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import { CompanyLeadCta } from "@/components/company-check/company-lead-cta"
import {
  CompanyCommitments,
  CompanyEmployerPage,
  CompanyFigures,
  CompanySources,
  formatSiren,
} from "@/components/company-check/company-sheet-sections"
import { PageLinks } from "@/components/page-links"
import { Section } from "@/components/section"
import type { CompanyCheckDictionary } from "@/content/company-check/types"
import type { LandingDictionary } from "@/content/types"
import { companyPagePath } from "@/lib/company-pages"
import { format, type Locale } from "@/lib/i18n"
import { marketPagePath } from "@/lib/market-pages"

/**
 * The sentence under the title, written from the record alone: the parts
 * the Annuaire does not publish are left out, never said "unknown".
 */
export function companyPageSummary(
  page: PublicCompanyPage,
  dictionary: CompanyCheckDictionary,
  locale: Locale
) {
  const { company } = page
  const text = dictionary.page
  const headcount = headcountLabel(company.headcountBand, locale)
  const sector = dictionary.sheet.nafSections[company.nafSection]
  const parts = [
    sector
      ? format(text.summaryActivity, { naf: company.nafCode, sector })
      : `NAF ${company.nafCode}.`,
  ]

  if (headcount) parts.push(format(text.summaryHeadcount, { headcount }))
  if (company.createdOn) {
    parts.push(
      format(text.summaryCreated, { year: company.createdOn.slice(0, 4) })
    )
  }

  return parts.join(" ")
}

/**
 * One company's page (US-140): the employer check's record, read from the
 * hourly refresh's copy, where it hires, and the way on to the companies
 * that hire in the visitor's job.
 */
export function CompanyPage({
  page,
  dictionary,
  errors,
  locale,
  crumbs,
  toolPath,
}: {
  page: PublicCompanyPage
  dictionary: CompanyCheckDictionary
  errors: LandingDictionary["ats"]
  locale: Locale
  crumbs: Crumb[]
  toolPath: string
}) {
  const { company } = page
  const text = dictionary.page
  const sheet = dictionary.sheet

  return (
    <Section className="py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Breadcrumbs crumbs={crumbs} label={text.breadcrumbLabel} />

        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {format(text.title, { name: company.legalName })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[
              format(sheet.siren, { siren: formatSiren(company.siren) }),
              company.category ? sheet.categories[company.category] : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-lg text-pretty text-muted-foreground">
            {companyPageSummary(page, dictionary, locale)}
          </p>
        </header>

        <section
          aria-labelledby="company-sheet"
          className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-raised md:p-8"
        >
          <h2 className="text-xl font-medium" id="company-sheet">
            {text.sheetTitle}
          </h2>
          <CompanyFigures
            company={company}
            dictionary={sheet}
            locale={locale}
          />
          <CompanyCommitments company={company} dictionary={sheet} />
          <CompanyEmployerPage company={company} dictionary={sheet} />
          <div className="flex flex-col gap-2">
            <CompanySources company={company} dictionary={sheet} />
            <p className="text-xs text-muted-foreground">
              {format(text.refreshed, {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "long",
                  timeZone: "Europe/Paris",
                }).format(new Date(page.refreshedAt)),
              })}
            </p>
          </div>
        </section>

        <CompanyLeadCta
          dictionary={dictionary}
          errors={errors}
          siren={company.siren}
        />

        {page.hiring.length > 0 ? (
          <section aria-labelledby="company-hiring">
            <h2 className="text-lg font-medium" id="company-hiring">
              {text.hiringTitle}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {page.hiring.map((row) => {
                const label = format(text.hiringItem, {
                  city: row.city,
                  department: row.department,
                  job: row.romeLabel,
                })

                return (
                  <li
                    className="flex items-center gap-2"
                    key={`${row.romeCode}-${row.department}`}
                  >
                    <MapPinIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    {row.hasMarketPage ? (
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={marketPagePath(locale, row)}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span>{label}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {text.hiringSource}
            </p>
          </section>
        ) : null}

        <PageLinks
          id="company-same-sector"
          links={page.sameSector.map((link) => ({
            href: companyPagePath(locale, link),
            label: link.name,
          }))}
          title={text.sameSectorTitle}
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
