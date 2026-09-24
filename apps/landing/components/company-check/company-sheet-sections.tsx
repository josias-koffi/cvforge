import { CheckIcon, ExternalLinkIcon, MinusIcon } from "lucide-react"
import {
  ANNUAIRE_COMPANY_URL,
  headcountLabel,
  type CompanyCheckSheet,
} from "@cvforge/types"

import type { CompanyCheckDictionary } from "@/content/company-check/types"
import { format, type Locale } from "@/lib/i18n"

type Sheet = CompanyCheckDictionary["sheet"]

/** Headcount, activity, age, establishments and revenue, in cards. */
export function CompanyFigures({
  company,
  dictionary,
  locale,
}: {
  company: CompanyCheckSheet
  dictionary: Sheet
  locale: Locale
}) {
  const section = dictionary.nafSections[company.nafSection]
  const figures = [
    [dictionary.headcount, headcountLabel(company.headcountBand, locale)],
    [
      dictionary.activity,
      [section, company.nafCode && `NAF ${company.nafCode}`]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      dictionary.created,
      company.createdOn
        ? new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(company.createdOn))
        : "",
    ],
    [
      dictionary.establishments,
      company.openEstablishments === null
        ? ""
        : new Intl.NumberFormat(locale).format(company.openEstablishments),
    ],
    [
      format(dictionary.revenue, { year: company.finances?.year ?? "" }).trim(),
      company.finances?.revenue == null
        ? ""
        : new Intl.NumberFormat(locale, {
            currency: "EUR",
            maximumFractionDigits: 1,
            notation: "compact",
            style: "currency",
          }).format(company.finances.revenue),
    ],
  ] as const

  return (
    <section>
      <h3 className="font-medium">{dictionary.figuresTitle}</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {figures.map(([label, value]) => (
          <div className="rounded-xl border p-4" key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value || dictionary.missing}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Each commitment as "yes" or "no" in words, never by colour alone. */
export function CompanyCommitments({
  company,
  dictionary,
}: {
  company: CompanyCheckSheet
  dictionary: Sheet
}) {
  const { commitments } = dictionary
  const rows: [string, boolean, string][] = [
    [commitments.mission, company.mission, ""],
    [commitments.ess, company.ess, ""],
    [commitments.inclusive, company.inclusive, ""],
    [commitments.ges, company.gesReport, ""],
    [
      commitments.egapro,
      company.egapro !== null,
      company.egapro
        ? format(dictionary.egaproScore, company.egapro)
        : dictionary.egaproMissing,
    ],
  ]

  return (
    <section>
      <h3 className="font-medium">{dictionary.commitmentsTitle}</h3>
      <ul className="mt-3 divide-y rounded-xl border">
        {rows.map(([label, held, detail]) => (
          <li className="flex items-center gap-3 px-4 py-3" key={label}>
            {held ? (
              <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
            ) : (
              <MinusIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            )}
            <span className="flex-1">{label}</span>
            <span className={held ? "font-medium" : "text-muted-foreground"}>
              {detail || (held ? dictionary.yes : dictionary.no)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Its France Travail page, when the hourly refresh found one. */
export function CompanyEmployerPage({
  company,
  dictionary,
}: {
  company: CompanyCheckSheet
  dictionary: Sheet
}) {
  const page = company.employerPage

  return (
    <section>
      <h3 className="font-medium">{dictionary.employerPageTitle}</h3>
      {page ? (
        <p className="mt-2">
          <ExternalLink href={page.url} newTab={dictionary.newTab}>
            {dictionary.employerPageLink}
          </ExternalLink>
          <span className="text-muted-foreground">
            {" · "}
            {format(dictionary.employerPageOffers, { count: page.offers })}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground">
          {dictionary.employerPageMissing}
        </p>
      )}
    </section>
  )
}

/** Every source the sheet read, the Annuaire's record linked. */
export function CompanySources({
  company,
  dictionary,
}: {
  company: CompanyCheckSheet
  dictionary: Sheet
}) {
  return (
    <section className="text-xs text-muted-foreground">
      <h3 className="font-medium">{dictionary.sourcesTitle}</h3>
      <ul className="mt-1 flex flex-col gap-1">
        <li>
          <ExternalLink
            href={`${ANNUAIRE_COMPANY_URL}/${company.siren}`}
            newTab={dictionary.newTab}
          >
            {dictionary.sources.annuaire}
          </ExternalLink>
        </li>
        {company.egapro ? <li>{dictionary.sources.egapro}</li> : null}
        {company.employerPage ? <li>{dictionary.sources.employerPage}</li> : null}
      </ul>
    </section>
  )
}

function ExternalLink({
  children,
  href,
  newTab,
}: {
  children: string
  href: string
  newTab: string
}) {
  return (
    <a
      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
      <span className="sr-only"> {newTab}</span>
      <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
    </a>
  )
}
