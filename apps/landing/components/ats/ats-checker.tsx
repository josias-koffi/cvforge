"use client"

import { useId, useRef, useState } from "react"
import {
  ChevronDownIcon,
  CircleAlertIcon,
  LockIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  ZapIcon,
} from "lucide-react"

import { CvDropZone } from "@/components/ats/cv-drop-zone"
import { ScanProgress } from "@/components/ats/scan-progress"
import { ScoreGauge } from "@/components/ats/score-gauge"
import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { stagger } from "@/components/ats/stagger"
import { UnlockForm } from "@/components/ats/unlock-form"
import { UnlockedReport } from "@/components/ats/unlocked-report"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import type { AtsScanResult, AtsUnlockResult } from "@/lib/ats-api"
import { postScan, scanErrorMessage } from "@/lib/ats-client"
import { format } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Status = "idle" | "scanning" | "done"

/**
 * The funnel itself: drop a file, get a score, unlock the detail with an email.
 *
 * Everything the visitor reads comes from the dictionary — the engine answers
 * in codes precisely so the wording can live here, in both languages.
 */
export function AtsChecker({
  dictionary,
  ctaHref,
  locale,
}: {
  dictionary: LandingDictionary["ats"]
  ctaHref: string
  locale: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [offerText, setOfferText] = useState("")
  const [showOffer, setShowOffer] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [scan, setScan] = useState<AtsScanResult | null>(null)
  const [unlocked, setUnlocked] = useState<AtsUnlockResult | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)
  const offerId = useId()
  const scanning = status === "scanning"

  function pick(selected: File | null) {
    setError(null)
    setFile(selected)
  }

  async function analyse() {
    if (!file || scanning) return

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
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {scan ? (
        <div
          className="animate-rise-in rounded-2xl border bg-card p-6 shadow-raised outline-none md:p-8"
          ref={resultRef}
          tabIndex={-1}
        >
          <div className="rise-in" style={stagger(0)}>
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
          </div>

          {scan.partial ? (
            <div
              className="mt-6 flex rise-in gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
              style={stagger(1)}
            >
              <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <h3 className="font-medium text-destructive">
                  {dictionary.result.partialTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dictionary.result.partialBody}
                </p>
              </div>
            </div>
          ) : null}

          {/* Dropped once the report is open: it lists these same findings, and
              showing them twice reads as a bug. */}
          {!unlocked && scan.highlights.length > 0 ? (
            <ul className="mt-6 space-y-2">
              {scan.highlights.map((code, index) => (
                <li
                  className="flex rise-in items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  key={code}
                  style={stagger(2 + index)}
                >
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>{dictionary.findings[code] ?? code}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {unlocked ? (
            <UnlockedReport dictionary={dictionary} report={unlocked} />
          ) : (
            <div
              className="mt-6 rise-in rounded-xl border bg-muted/30 p-5"
              style={stagger(3 + scan.highlights.length)}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LockIcon className="size-4" />
                </span>
                <div>
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
                </div>
              </div>
              <UnlockForm
                dictionary={dictionary}
                onUnlocked={setUnlocked}
                scanId={scan.scanId}
              />
            </div>
          )}

          <div
            className="mt-6 flex rise-in flex-wrap gap-3 border-t pt-6"
            style={stagger(4 + scan.highlights.length)}
          >
            <Button asChild variant="spark">
              <a href={ctaHref}>
                <ZapIcon />
                {dictionary.cta}
              </a>
            </Button>
            <Button onClick={restart} type="button" variant="outline">
              <RotateCcwIcon />
              {dictionary.result.again}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-raised md:p-8">
          <h2 className="font-medium">{dictionary.upload.label}</h2>

          <CvDropZone
            dictionary={dictionary.upload}
            disabled={scanning}
            file={file}
            locale={locale}
            onFile={pick}
            onReject={(reason) => {
              setFile(null)
              setError(dictionary.upload[reason])
            }}
          />

          {/* Right under the zone it is about, and announced without stealing
              focus — which the result panel takes instead. */}
          <p
            aria-live="polite"
            className="text-sm text-destructive"
            role="status"
          >
            {/* Kept mounted and empty rather than hidden: a live region that
                appears with its message is often not read out. */}
            {error ? (
              <span className="mt-3 flex animate-rise-in items-start gap-1.5">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
                {error}
              </span>
            ) : null}
          </p>

          <div className="mt-4">
            <button
              aria-expanded={showOffer}
              className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              disabled={scanning}
              onClick={() => setShowOffer((open) => !open)}
              type="button"
            >
              {dictionary.offer.toggle}
              <ChevronDownIcon
                className={cn(
                  "size-4 transition-transform duration-200 ease-spark",
                  showOffer && "rotate-180"
                )}
              />
            </button>

            {showOffer ? (
              <div className="mt-3 animate-rise-in">
                <label className="block text-sm font-medium" htmlFor={offerId}>
                  {dictionary.offer.label}
                </label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dictionary.offer.hint}
                </p>
                <textarea
                  className="mt-2 w-full rounded-lg border bg-background p-3 text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  disabled={scanning}
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
            className={cn(
              "mt-6 h-11 w-full text-base",
              sparkPendingClassName(scanning)
            )}
            disabled={!file || scanning}
            onClick={analyse}
            size="lg"
            type="button"
            variant="spark"
          >
            <SparkPending
              pending={scanning}
              pendingLabel={dictionary.upload.analysing}
            >
              <ZapIcon />
              {dictionary.upload.analyse}
            </SparkPending>
          </Button>

          {scanning ? <ScanProgress dictionary={dictionary.progress} /> : null}

          <p className="mt-4 text-xs text-muted-foreground">
            {dictionary.privacyNote}
          </p>
        </div>
      )}
    </div>
  )
}
