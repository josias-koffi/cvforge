"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, CircleAlertIcon, ZapIcon } from "lucide-react"

import { AtsResult } from "@/components/ats/ats-result"
import { CvDropZone } from "@/components/ats/cv-drop-zone"
import { ScanProgress } from "@/components/ats/scan-progress"
import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import type { AtsScanResult, AtsUnlockResult } from "@/lib/ats-api"
import { postScan, scanErrorMessage } from "@/lib/ats-client"
import { atsFunnel } from "@/lib/ats-funnel"
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

  const funnel = useMemo(() => atsFunnel(locale), [locale])

  // Counted once per visitor and day by the API, so a remount or a second
  // scan in the same visit adds nothing (US-131).
  useEffect(() => {
    funnel.viewed()
  }, [funnel])

  function unlock(report: AtsUnlockResult) {
    setUnlocked(report)
    funnel.emailSubmitted()
  }

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
        showOffer && offerText.trim() ? offerText : null,
        locale
      )) as AtsScanResult

      setScan(result)
      setStatus("done")
      funnel.scanned()
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
        <AtsResult
          ctaHref={ctaHref}
          dictionary={dictionary}
          onCtaClick={funnel.ctaClicked}
          onRestart={restart}
          onUnlocked={unlock}
          ref={resultRef}
          scan={scan}
          unlocked={unlocked}
        />
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
