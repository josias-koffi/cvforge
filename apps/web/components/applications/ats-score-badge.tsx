import type { AtsScoreSummary } from "@cvforge/types"

import { Badge } from "@/components/ui/badge"
import { ATS_BAND_LABELS, atsScoreLabel, readableScore } from "@/lib/ats"

/** The semantic badge variant each band maps to. */
const BAND_VARIANT = {
  weak: "destructive",
  fair: "warning",
  good: "info",
  excellent: "success",
} as const

/**
 * The ATS score of a generated CV.
 *
 * Renders nothing at all when there is no score: a CV generated before the
 * feature shipped, or one whose scoring failed, has not been measured — and a
 * "0" would tell the candidate their CV is terrible rather than unmeasured.
 *
 * The band is written next to the number, so colour is never the only thing
 * carrying the verdict, and the accessible name spells out the whole sentence.
 */
export function AtsScoreBadge({
  score,
  showBand = true,
  stale = false,
}: {
  score: AtsScoreSummary | null | undefined
  /** Off where space is tight; the accessible name still carries the band. */
  showBand?: boolean
  /**
   * The editor has unsaved changes, so this score describes the last saved
   * version and not what is on screen. Said plainly rather than left to look
   * current — a stale number is worse than no number.
   */
  stale?: boolean
}) {
  const readable = readableScore(score)

  if (!readable) return null

  const label = stale
    ? `${atsScoreLabel(readable)} (dernière version enregistrée)`
    : atsScoreLabel(readable)

  return (
    <Badge
      aria-label={label}
      className={stale ? "opacity-60" : undefined}
      title={label}
      variant={BAND_VARIANT[readable.band]}
    >
      <span aria-hidden="true" className="tabular-nums">
        {readable.overallScore}
      </span>
      {showBand ? (
        <span aria-hidden="true">{ATS_BAND_LABELS[readable.band]}</span>
      ) : null}
    </Badge>
  )
}
