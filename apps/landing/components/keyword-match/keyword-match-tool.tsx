"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { CircleAlertIcon, ListChecksIcon } from "lucide-react"
import type { PublicKeywordMatchResponse } from "@cvforge/types"

import { CvDropZone } from "@/components/ats/cv-drop-zone"
import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { KeywordMatchResult } from "@/components/keyword-match/keyword-match-result"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { toolFunnel } from "@/lib/ats-funnel"
import { format } from "@/lib/i18n"
import {
  MAX_OFFER_CHARS,
  MIN_OFFER_CHARS,
  postKeywordMatch,
} from "@/lib/keyword-match-client"
import { cn } from "@/lib/utils"

/**
 * The free CV ↔ offer comparator (US-136): a CV and an offer in, the offer's
 * terms found and missing out. No model, nothing kept.
 */
export function KeywordMatchTool({
  dictionary,
  ats,
  locale,
}: {
  dictionary: LandingDictionary["keywordMatch"]
  /** The drop zone's wording and the refusals, shared with the ATS check. */
  ats: LandingDictionary["ats"]
  locale: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [offerText, setOfferText] = useState("")
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PublicKeywordMatchResponse | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)
  const offerId = useId()
  const offerHintId = useId()
  const counterId = useId()

  const funnel = useMemo(() => toolFunnel("keyword_match", locale), [locale])

  // Counted once per visitor and day by the API (US-131).
  useEffect(() => {
    funnel.viewed()
  }, [funnel])

  // The result replaces the form: move the reader to it, once it is mounted.
  // A frame scheduled from `compare` fired before React committed the panel,
  // and the focus stayed on the page body.
  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  const offerLength = offerText.trim().length
  const offerReady = offerLength >= MIN_OFFER_CHARS
  const ready = file !== null && offerReady && !comparing

  async function compare() {
    if (!file || !ready) return

    setComparing(true)
    setError(null)

    try {
      setResult(await postKeywordMatch(file, offerText.trim()))
      funnel.scanned()
    } catch (caught) {
      setError(scanErrorMessage(caught, ats))
    } finally {
      setComparing(false)
    }
  }

  function restart() {
    setResult(null)
    setError(null)
  }

  if (result) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <KeywordMatchResult
          dictionary={dictionary}
          errors={ats}
          offerText={offerText.trim()}
          onCtaClick={funnel.ctaClicked}
          onLeadSent={funnel.emailSubmitted}
          onRestart={restart}
          ref={resultRef}
          result={result}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-raised md:p-8">
      <h2 className="font-medium">{dictionary.cvLabel}</h2>
      <CvDropZone
        dictionary={ats.upload}
        disabled={comparing}
        file={file}
        locale={locale}
        onFile={(selected) => {
          setError(null)
          setFile(selected)
        }}
        onReject={(reason) => {
          setFile(null)
          setError(ats.upload[reason])
        }}
      />

      <label className="mt-6 block font-medium" htmlFor={offerId}>
        {dictionary.offer.label}
      </label>
      <p className="mt-1 text-sm text-muted-foreground" id={offerHintId}>
        {dictionary.offer.hint}
      </p>
      <textarea
        aria-describedby={`${offerHintId} ${counterId}`}
        className="mt-2 w-full rounded-lg border bg-background p-3 text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        disabled={comparing}
        id={offerId}
        maxLength={MAX_OFFER_CHARS}
        onChange={(event) => setOfferText(event.target.value)}
        placeholder={dictionary.offer.placeholder}
        rows={8}
        value={offerText}
      />
      <p
        className={cn(
          "mt-1 text-right text-xs",
          offerReady ? "text-muted-foreground" : "text-foreground"
        )}
        id={counterId}
      >
        {offerReady
          ? format(dictionary.offer.counterReady, { count: offerLength })
          : format(dictionary.offer.counter, {
              count: offerLength,
              min: MIN_OFFER_CHARS,
            })}
      </p>

      <p aria-live="polite" className="text-sm text-destructive" role="status">
        {/* Kept mounted and empty: a live region that appears with its
            message is often not read out. */}
        {error ? (
          <span className="mt-3 flex animate-rise-in items-start gap-1.5">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </span>
        ) : null}
      </p>

      <Button
        className={cn(
          "mt-6 h-11 w-full text-base",
          sparkPendingClassName(comparing)
        )}
        disabled={!ready}
        onClick={compare}
        size="lg"
        type="button"
        variant="spark"
      >
        <SparkPending pending={comparing} pendingLabel={dictionary.comparing}>
          <ListChecksIcon />
          {dictionary.compare}
        </SparkPending>
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        {dictionary.privacyNote}
      </p>
    </div>
  )
}
