"use client"

import { forwardRef, useState } from "react"
import {
  CircleCheckIcon,
  CircleDashedIcon,
  MailCheckIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"
import type { PublicKeywordMatchResponse } from "@cvforge/types"

import { EmailConsentForm } from "@/components/ats/email-consent-form"
import { ScoreGauge, type Band } from "@/components/ats/score-gauge"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { format } from "@/lib/i18n"
import { postKeywordMatchLead } from "@/lib/keyword-match-client"

type Dictionary = LandingDictionary["keywordMatch"]

/** The comparator has three bands; the gauge's colours are the ATS check's. */
const GAUGE_BAND: Record<PublicKeywordMatchResponse["band"], Band> = {
  low: "weak",
  fair: "fair",
  good: "excellent",
}

/**
 * What the comparison found, then the way on: a CV generated for this offer,
 * which takes an account (US-136).
 */
export const KeywordMatchResult = forwardRef<
  HTMLDivElement,
  {
    dictionary: Dictionary
    errors: LandingDictionary["ats"]
    result: PublicKeywordMatchResponse
    offerText: string
    onCtaClick: () => void
    onLeadSent: () => void
    onRestart: () => void
  }
>(function KeywordMatchResult(
  { dictionary, errors, result, offerText, onCtaClick, onLeadSent, onRestart },
  ref
) {
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadSent, setLeadSent] = useState(false)
  const { bands } = dictionary.result.gauge

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-live="polite"
        className="rounded-2xl border bg-card p-6 shadow-raised focus-visible:outline-none md:p-8"
        ref={ref}
        tabIndex={-1}
      >
        <h2 className="text-center text-xl font-medium">
          {dictionary.result.title}
        </h2>
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <ScoreGauge
            band={GAUGE_BAND[result.band]}
            dictionary={{
              ...dictionary.result.gauge,
              bands: {
                weak: bands.low,
                fair: bands.fair,
                good: bands.good,
                excellent: bands.good,
              },
            }}
            score={result.coverage}
          />
          <p className="max-w-md text-pretty">
            {dictionary.result.verdicts[result.band]}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(dictionary.result.summary, {
              count: result.matchedCount,
              total: result.matchedCount + result.missingCount,
            })}
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <TermList
            empty={dictionary.result.missingEmpty}
            icon={CircleDashedIcon}
            more={dictionary.result.more}
            terms={result.missing}
            title={dictionary.result.missingTitle}
            total={result.missingCount}
          />
          <TermList
            empty={dictionary.result.matchedEmpty}
            icon={CircleCheckIcon}
            more={dictionary.result.more}
            terms={result.matched}
            title={dictionary.result.matchedTitle}
            total={result.matchedCount}
          />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {dictionary.result.method}
        </p>
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
              await postKeywordMatchLead(email, consent, offerText)
              setLeadSent(true)
              onLeadSent()
            }}
          />
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{dictionary.cta.body}</p>
            <Button
              className="mt-4 h-11 w-full text-base"
              onClick={() => {
                setLeadOpen(true)
                onCtaClick()
              }}
              size="lg"
              type="button"
              variant="spark"
            >
              <SparklesIcon />
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
        {dictionary.result.again}
      </Button>
    </div>
  )
})

/** One side of the comparison. The icon says it too, not only the heading. */
function TermList({
  title,
  icon: Icon,
  terms,
  total,
  more,
  empty,
}: {
  title: string
  icon: LucideIcon
  terms: string[]
  total: number
  more: string
  empty: string
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 font-medium">
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        {title}
        <span className="text-sm font-normal text-muted-foreground">
          ({total})
        </span>
      </h3>
      {terms.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {terms.map((term) => (
            <li
              className="rounded-full border px-2.5 py-0.5 text-sm text-foreground"
              key={term}
            >
              {term}
            </li>
          ))}
          {total > terms.length ? (
            <li className="px-1 py-0.5 text-sm text-muted-foreground">
              {format(more, { count: total - terms.length })}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
