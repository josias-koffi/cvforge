"use client"

import { useId, useRef, useState } from "react"

import { ScoreGauge } from "@/components/ats/score-gauge"
import { UnlockForm } from "@/components/ats/unlock-form"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import type { AtsScanResult, AtsUnlockResult } from "@/lib/ats-api"
import {
  CV_ACCEPT,
  cvRejectionReason,
  postScan,
  scanErrorMessage,
} from "@/lib/ats-client"
import { format } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Status = "idle" | "scanning" | "done"

/**
 * The funnel itself: pick a file, get a score, unlock the detail with an email.
 *
 * Everything the visitor reads comes from the dictionary — the engine answers
 * in codes precisely so the wording can live here, in both languages.
 */
export function AtsChecker({
  dictionary,
  ctaHref,
}: {
  dictionary: LandingDictionary["ats"]
  ctaHref: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [offerText, setOfferText] = useState("")
  const [showOffer, setShowOffer] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [scan, setScan] = useState<AtsScanResult | null>(null)
  const [unlocked, setUnlocked] = useState<AtsUnlockResult | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const offerId = useId()
  const fileNameId = useId()

  function pick(selected: File | null) {
    setError(null)

    if (!selected) {
      setFile(null)
      return
    }

    const rejection = cvRejectionReason(selected)

    if (rejection) {
      setFile(null)
      setError(dictionary.upload[rejection])
      return
    }

    setFile(selected)
  }

  async function analyse() {
    if (!file || status === "scanning") return

    setStatus("scanning")
    setError(null)

    try {
      const result = (await postScan(
        file,
        showOffer && offerText.trim() ? offerText : null
      )) as AtsScanResult

      setScan(result)
      setStatus("done")
      // The score is why they came: move the reader to it rather than leaving
      // them at the top of a page that silently changed below.
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch (caught) {
      setError(scanErrorMessage(caught, dictionary))
      setStatus("idle")
    }
  }

  function restart() {
    setFile(null)
    setScan(null)
    setUnlocked(null)
    setError(null)
    setStatus("idle")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {scan ? (
        <div
          className="rounded-xl border bg-card p-6 shadow-surface md:p-8"
          ref={resultRef}
          tabIndex={-1}
        >
          <ScoreGauge
            band={scan.band}
            dictionary={dictionary.result}
            score={scan.overallScore}
          />

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {format(dictionary.result.dimensionsScored, {
              count: scan.scoredDimensionCount,
            })}
          </p>

          {scan.partial ? (
            <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <h3 className="font-medium text-destructive">
                {dictionary.result.partialTitle}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {dictionary.result.partialBody}
              </p>
            </div>
          ) : null}

          {/* Dropped once the report is open: it lists these same findings, and
              showing them twice reads as a bug. */}
          {!unlocked && scan.highlights.length > 0 ? (
            <ul className="mt-6 space-y-2">
              {scan.highlights.map((code) => (
                <li className="flex gap-2 text-sm" key={code}>
                  <span aria-hidden="true" className="text-muted-foreground">
                    •
                  </span>
                  <span>{dictionary.findings[code] ?? code}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {unlocked ? (
            <UnlockedReport dictionary={dictionary} report={unlocked} />
          ) : (
            <div className="mt-6 border-t pt-6">
              {/* "0 autres points détectés" is a hook that deflates on the very
                  CVs that scored well; the breakdown is the offer then. */}
              <h3 className="font-medium">
                {scan.lockedFindingCount > 0
                  ? format(dictionary.result.lockedTitle, {
                      count: scan.lockedFindingCount,
                    })
                  : dictionary.result.lockedTitleNone}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {dictionary.result.lockedBody}
              </p>
              <UnlockForm
                dictionary={dictionary}
                onUnlocked={setUnlocked}
                scanId={scan.scanId}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t pt-6">
            <Button asChild variant="spark">
              <a href={ctaHref}>{dictionary.cta}</a>
            </Button>
            <Button onClick={restart} type="button" variant="outline">
              {dictionary.result.again}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 shadow-surface md:p-8">
          <label className="block font-medium" htmlFor={fileNameId}>
            {dictionary.upload.label}
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            {dictionary.upload.hint}
          </p>

          <input
            accept={CV_ACCEPT}
            className={cn(
              "mt-4 block w-full cursor-pointer rounded-lg border border-dashed bg-background p-4 text-sm",
              "file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            id={fileNameId}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
            ref={inputRef}
            type="file"
          />

          <div className="mt-4">
            <button
              aria-expanded={showOffer}
              className="text-sm underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setShowOffer((open) => !open)}
              type="button"
            >
              {dictionary.offer.toggle}
            </button>

            {showOffer ? (
              <div className="mt-3">
                <label className="block text-sm font-medium" htmlFor={offerId}>
                  {dictionary.offer.label}
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dictionary.offer.hint}
                </p>
                <textarea
                  className="mt-2 w-full rounded-lg border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id={offerId}
                  onChange={(event) => setOfferText(event.target.value)}
                  placeholder={dictionary.offer.placeholder}
                  rows={5}
                  value={offerText}
                />
              </div>
            ) : null}
          </div>

          <Button
            className="mt-6 w-full"
            disabled={!file || status === "scanning"}
            onClick={analyse}
            size="lg"
            type="button"
            variant="spark"
          >
            {status === "scanning"
              ? dictionary.upload.analysing
              : dictionary.upload.analyse}
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            {dictionary.privacyNote}
          </p>
        </div>
      )}

      {/* Announced without stealing focus, which the result panel takes instead. */}
      <p aria-live="polite" className="mt-4 text-sm text-destructive" role="status">
        {error}
      </p>
    </div>
  )
}

function UnlockedReport({
  dictionary,
  report,
}: {
  dictionary: LandingDictionary["ats"]
  report: AtsUnlockResult
}) {
  const scored = report.result.dimensions.filter(
    (dimension) => dimension.status === "scored"
  )

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="font-medium">{dictionary.unlock.success}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {dictionary.unlock.successBody}
      </p>

      <dl className="mt-4 space-y-2">
        {scored.map((dimension) => (
          <div className="flex justify-between gap-4 text-sm" key={dimension.key}>
            <dt>{dictionary.dimensions[dimension.key] ?? dimension.key}</dt>
            <dd className="font-medium tabular-nums">
              {dimension.score} / 100
            </dd>
          </div>
        ))}
      </dl>

      {report.result.findings.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {report.result.findings.map((finding) => (
            <li className="flex gap-2 text-sm" key={finding.code}>
              <span aria-hidden="true" className="text-muted-foreground">
                •
              </span>
              <span>{dictionary.findings[finding.code] ?? finding.code}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
