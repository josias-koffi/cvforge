"use client"

import { forwardRef } from "react"
import { HourglassIcon, RotateCcwIcon } from "lucide-react"
import type { PublicJobMarketResponse } from "@cvforge/types"

import {
  MarketFigures,
  TensionGauge,
} from "@/components/job-market/job-market-figures"
import { JobMarketLeadCta } from "@/components/job-market/job-market-lead-cta"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { format } from "@/lib/i18n"

type Dictionary = LandingDictionary["jobMarket"]

/**
 * The job's market in the department, its sources, then the way on: the
 * morning e-mail of its offers, which takes an account (US-137).
 */
export const JobMarketResult = forwardRef<
  HTMLDivElement,
  {
    dictionary: Dictionary
    errors: LandingDictionary["ats"]
    result: PublicJobMarketResponse
    locale: string
    onCtaClick: () => void
    onLeadSent: () => void
    onRestart: () => void
  }
>(function JobMarketResult(
  { dictionary, errors, result, locale, onCtaClick, onLeadSent, onRestart },
  ref
) {
  const { appellation } = result
  const text = dictionary.result

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-live="polite"
        className="rounded-2xl border bg-card p-6 shadow-raised focus-visible:outline-none md:p-8"
        ref={ref}
        tabIndex={-1}
      >
        <h2 className="text-xl font-medium text-balance">
          {format(text.title, {
            department: `${result.departmentLabel} (${result.department})`,
            job: appellation.libelle,
          })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(text.romeNote, {
            code: appellation.metierCode,
            label: appellation.metierLibelle,
          })}
        </p>

        {result.stats ? (
          <div className="mt-6 flex flex-col gap-4">
            <TensionGauge dictionary={text} tension={result.stats.tension} />
            <MarketFigures
              dictionary={text}
              locale={locale}
              salaryMinSample={result.salaryMinSample}
              stats={result.stats}
            />
          </div>
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-xl border p-5">
            <HourglassIcon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            />
            <div>
              <h3 className="font-medium">{text.collecting.title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {text.collecting.body}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-1 text-xs text-muted-foreground">
          <p>{text.sources.market}</p>
          <p>{text.sources.salary}</p>
          {result.refreshedAt ? (
            <p>
              {format(text.refreshed, {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "long",
                  timeZone: "Europe/Paris",
                }).format(new Date(result.refreshedAt)),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <JobMarketLeadCta
        appellationCode={appellation.code}
        department={result.department}
        dictionary={dictionary}
        errors={errors}
        onCtaClick={onCtaClick}
        onLeadSent={onLeadSent}
      />

      <Button
        className="self-center"
        onClick={onRestart}
        type="button"
        variant="ghost"
      >
        <RotateCcwIcon />
        {text.again}
      </Button>
    </div>
  )
})
