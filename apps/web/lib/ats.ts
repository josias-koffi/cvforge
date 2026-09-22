import type { AtsScoreSummary } from "@cvforge/types"

/**
 * Wording for the score bands.
 *
 * The engine answers in codes so the words live here; these mirror the landing
 * dictionary, and the two should be changed together.
 */
export const ATS_BAND_LABELS: Record<AtsScoreSummary["band"], string> = {
  weak: "Fragile",
  fair: "Perfectible",
  good: "Solide",
  excellent: "Excellent",
}

/**
 * Colour never carries the verdict on its own — the band is always spelled out
 * beside the number, and this is only the accent.
 */
export const ATS_BAND_STYLES: Record<AtsScoreSummary["band"], string> = {
  weak: "border-destructive/40 text-destructive",
  fair: "border-warning/40 text-warning",
  good: "border-info/40 text-info",
  excellent: "border-success/40 text-success",
}

/** What a screen reader announces: the whole verdict in one sentence. */
export function atsScoreLabel(score: AtsScoreSummary) {
  return `Score ATS ${score.overallScore} sur 100, ${ATS_BAND_LABELS[score.band].toLowerCase()}`
}

/**
 * A score worth showing, or null.
 *
 * A CV generated before the feature shipped has none, and a scoring failure
 * leaves none either. Both must read as "not measured" — rendering a 0 would
 * tell the candidate their CV is terrible when it was simply never scored.
 */
export function readableScore(
  score: AtsScoreSummary | null | undefined,
): AtsScoreSummary | null {
  if (!score) return null

  return Number.isFinite(score.overallScore) ? score : null
}
