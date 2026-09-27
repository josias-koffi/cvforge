import type { Ref } from "react"
import {
  CircleAlertIcon,
  LockIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  ZapIcon,
} from "lucide-react"

import { ScoreGauge } from "@/components/ats/score-gauge"
import { stagger } from "@/components/ats/stagger"
import { UnlockForm } from "@/components/ats/unlock-form"
import { UnlockedReport } from "@/components/ats/unlocked-report"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import type { AtsScanResult, AtsUnlockResult } from "@/lib/ats-api"
import { format } from "@/lib/i18n"

/**
 * The score, the three free points, then the email gate or the full report.
 * Stateless: `AtsChecker` owns the funnel and passes its handlers down.
 */
export function AtsResult({
  ctaHref,
  dictionary,
  onCtaClick,
  onRestart,
  onUnlocked,
  ref,
  scan,
  unlocked,
}: {
  ctaHref: string
  dictionary: LandingDictionary["ats"]
  onCtaClick: () => void
  onRestart: () => void
  onUnlocked: (report: AtsUnlockResult) => void
  ref: Ref<HTMLDivElement>
  scan: AtsScanResult
  unlocked: AtsUnlockResult | null
}) {
  return (
    <div
      className="animate-rise-in rounded-2xl border bg-card p-6 shadow-raised outline-none md:p-8"
      ref={ref}
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
            onUnlocked={onUnlocked}
            scanId={scan.scanId}
          />
        </div>
      )}

      <div
        className="mt-6 flex rise-in flex-wrap gap-3 border-t pt-6"
        style={stagger(4 + scan.highlights.length)}
      >
        <Button asChild variant="spark">
          <a href={ctaHref} onClick={onCtaClick}>
            <ZapIcon />
            {dictionary.cta}
          </a>
        </Button>
        <Button onClick={onRestart} type="button" variant="outline">
          <RotateCcwIcon />
          {dictionary.result.again}
        </Button>
      </div>
    </div>
  )
}
