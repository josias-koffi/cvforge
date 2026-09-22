import type { AtsScoreSummary } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AtsScoreBadge } from "@/components/applications/ats-score-badge"
import { ATS_BAND_LABELS, atsScoreLabel, readableScore } from "@/lib/ats"

function makeScore(overrides: Partial<AtsScoreSummary> = {}): AtsScoreSummary {
  return {
    band: "good",
    engineVersion: "1.1.0",
    overallScore: 72,
    ...overrides,
  }
}

const BANDS = ["weak", "fair", "good", "excellent"] as const

describe("AtsScoreBadge", () => {
  it("shows the number and the band in words", () => {
    const markup = renderToStaticMarkup(<AtsScoreBadge score={makeScore()} />)

    expect(markup).toContain("72")
    expect(markup).toContain(ATS_BAND_LABELS.good)
  })

  /**
   * A quarter of readers would miss a verdict carried by colour alone, and "72"
   * means nothing without knowing whether that is good.
   */
  it.each(BANDS)("names the %s band rather than relying on colour", (band) => {
    const markup = renderToStaticMarkup(
      <AtsScoreBadge score={makeScore({ band })} />
    )

    expect(markup).toContain(ATS_BAND_LABELS[band])
  })

  it("carries the whole verdict as its accessible name", () => {
    const markup = renderToStaticMarkup(
      <AtsScoreBadge score={makeScore({ band: "weak", overallScore: 31 })} />
    )

    expect(markup).toContain('aria-label="Score ATS 31 sur 100, fragile"')
  })

  it("keeps the accessible name even when the band is not written out", () => {
    const markup = renderToStaticMarkup(
      <AtsScoreBadge score={makeScore()} showBand={false} />
    )

    expect(markup).not.toContain(`>${ATS_BAND_LABELS.good}<`)
    expect(markup).toContain("aria-label")
  })

  /**
   * A CV generated before the feature shipped, or one whose scoring failed,
   * has not been measured. A zero would tell the candidate their CV is
   * terrible instead.
   */
  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("renders nothing at all when the score is %s", (_label, score) => {
    expect(renderToStaticMarkup(<AtsScoreBadge score={score} />)).toBe("")
  })

  it("renders nothing for a score that is not a number", () => {
    const broken = { ...makeScore(), overallScore: Number.NaN }

    expect(renderToStaticMarkup(<AtsScoreBadge score={broken} />)).toBe("")
  })

  it("still renders a zero that was actually measured", () => {
    const markup = renderToStaticMarkup(
      <AtsScoreBadge score={makeScore({ band: "weak", overallScore: 0 })} />
    )

    expect(markup).toContain("0")
  })

  /** The score describes the last saved version, not what is on screen. */
  it("says so when the editor has unsaved changes", () => {
    const markup = renderToStaticMarkup(
      <AtsScoreBadge score={makeScore()} stale />
    )

    expect(markup).toContain("dernière version enregistrée")
    expect(markup).toContain("opacity-60")
  })

  it("does not claim staleness when the document is saved", () => {
    const markup = renderToStaticMarkup(<AtsScoreBadge score={makeScore()} />)

    expect(markup).not.toContain("dernière version enregistrée")
  })
})

describe("atsScoreLabel", () => {
  it("reads as one sentence a screen reader can announce", () => {
    expect(atsScoreLabel(makeScore({ band: "excellent", overallScore: 95 }))).toBe(
      "Score ATS 95 sur 100, excellent"
    )
  })
})

describe("readableScore", () => {
  it("keeps a measured score", () => {
    expect(readableScore(makeScore())).not.toBeNull()
  })

  it("rejects what was never measured", () => {
    expect(readableScore(null)).toBeNull()
    expect(readableScore(undefined)).toBeNull()
  })
})
