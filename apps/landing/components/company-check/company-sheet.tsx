"use client"

import { forwardRef } from "react"
import { ArrowLeftIcon, Building2Icon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import type { PublicCompanyCheckResponse } from "@cvforge/types"

import {
  CompanyCommitments,
  CompanyEmployerPage,
  CompanyFigures,
  CompanySources,
} from "@/components/company-check/company-sheet-sections"
import { ToolLeadCta } from "@/components/tools/tool-lead-cta"
import { Button } from "@/components/ui/button"
import type { CompanyCheckDictionary } from "@/content/company-check/types"
import type { LandingDictionary } from "@/content/types"
import { postCompanyCheckLead } from "@/lib/company-check-client"
import { format, type Locale } from "@/lib/i18n"

/**
 * One company's record, its sources, then the way on: the companies that
 * hire in the visitor's job, which takes an account (US-139).
 */
export const CompanySheet = forwardRef<
  HTMLDivElement,
  {
    dictionary: CompanyCheckDictionary
    errors: LandingDictionary["ats"]
    locale: Locale
    result: PublicCompanyCheckResponse
    onBack: (() => void) | null
    onCtaClick: () => void
    onLeadSent: () => void
    onRestart: () => void
  }
>(function CompanySheet(
  { dictionary, errors, locale, result, onBack, onCtaClick, onLeadSent, onRestart },
  ref
) {
  const text = dictionary.sheet

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-live="polite"
        className="rounded-2xl border bg-card p-6 shadow-raised focus-visible:outline-none md:p-8"
        ref={ref}
        tabIndex={-1}
      >
        {result.status === "found" ? (
          <div className="flex flex-col gap-6">
            <header>
              <h2 className="text-xl font-medium text-balance">
                {result.company.legalName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  format(text.siren, { siren: formatSiren(result.company.siren) }),
                  result.company.category
                    ? text.categories[result.company.category]
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {result.company.closed ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 p-3 text-sm">
                  <TriangleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-destructive"
                  />
                  {text.closed}
                </p>
              ) : null}
            </header>
            <CompanyFigures company={result.company} dictionary={text} locale={locale} />
            <CompanyCommitments company={result.company} dictionary={text} />
            <CompanyEmployerPage company={result.company} dictionary={text} />
            <CompanySources company={result.company} dictionary={text} />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Building2Icon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            />
            <div>
              <h2 className="text-lg font-medium">{dictionary.unknown.title}</h2>
              <p className="mt-1 text-pretty text-muted-foreground">
                {dictionary.unknown.body}
              </p>
            </div>
          </div>
        )}
      </div>

      {result.status === "found" ? (
        <ToolLeadCta
          dictionary={dictionary}
          errors={errors}
          icon={<Building2Icon />}
          onCtaClick={onCtaClick}
          onLeadSent={onLeadSent}
          submit={(email, consent) =>
            postCompanyCheckLead(email, consent, result.company.siren)
          }
        />
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {onBack ? (
          <Button onClick={onBack} type="button" variant="ghost">
            <ArrowLeftIcon />
            {dictionary.results.back}
          </Button>
        ) : null}
        <Button onClick={onRestart} type="button" variant="ghost">
          <RotateCcwIcon />
          {text.again}
        </Button>
      </div>
    </div>
  )
})

/** "381 983 568", as the Annuaire prints it. */
function formatSiren(siren: string) {
  return siren.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3")
}
