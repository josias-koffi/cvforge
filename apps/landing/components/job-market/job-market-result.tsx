"use client"

import { forwardRef, useState } from "react"
import {
  HourglassIcon,
  MailCheckIcon,
  RotateCcwIcon,
  SendIcon,
  SunriseIcon,
} from "lucide-react"
import type { PublicJobMarketResponse } from "@cvforge/types"

import { EmailConsentForm } from "@/components/ats/email-consent-form"
import {
  MarketFigures,
  TensionGauge,
} from "@/components/job-market/job-market-figures"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { format } from "@/lib/i18n"
import { postJobMarketLead } from "@/lib/job-market-client"

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
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadSent, setLeadSent] = useState(false)
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

      <section className="rounded-2xl border bg-card p-6 shadow-raised md:p-8">
        <h2 className="text-lg font-medium">{dictionary.cta.title}</h2>
        {leadSent ? (
          <div className="mt-3 flex items-start gap-3" role="status">
            <MailCheckIcon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-success"
            />
            <div>
              <p className="font-medium">{dictionary.lead.success}</p>
              <p className="text-sm text-muted-foreground">
                {dictionary.lead.successBody}
              </p>
            </div>
          </div>
        ) : leadOpen ? (
          <EmailConsentForm
            errorMessage={(error) => scanErrorMessage(error, errors)}
            icon={<SendIcon />}
            labels={dictionary.lead}
            onSubmit={async (email, consent) => {
              await postJobMarketLead(
                email,
                consent,
                appellation.code,
                result.department
              )
              setLeadSent(true)
              onLeadSent()
            }}
          />
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{dictionary.cta.body}</p>
            <Button
              className="mt-4 h-auto min-h-11 w-full text-base whitespace-normal"
              onClick={() => {
                setLeadOpen(true)
                onCtaClick()
              }}
              size="lg"
              type="button"
              variant="spark"
            >
              <SunriseIcon />
              {dictionary.cta.button}
            </Button>
          </>
        )}
      </section>

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
