import { renderToStaticMarkup } from "react-dom/server"
import type { AtsScoreDetail } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import { AtsScoreSheet } from "@/components/applications/ats-score-sheet"
import { ATS_FINDING_FIXES, ATS_FINDING_LABELS } from "@/lib/ats-report"

const SCORE: AtsScoreDetail = {
  band: "fair",
  engineVersion: "1.1.0",
  overallScore: 65,
  dimensions: [{ key: "impact", score: 24, status: "scored" }],
  findings: [
    { code: "MISSING_ACTION_VERBS", severity: "warning", dimension: "impact" },
  ],
}

describe("AtsScoreSheet", () => {
  it("turns the badge into a way into the analysis", () => {
    const markup = renderToStaticMarkup(<AtsScoreSheet score={SCORE} />)

    expect(markup).toContain("<button")
    expect(markup).toContain("Voir l&#x27;analyse")
    expect(markup).toContain("65")
  })

  it("stays a plain badge when the score carries no detail", () => {
    const summary = {
      band: SCORE.band,
      engineVersion: SCORE.engineVersion,
      overallScore: SCORE.overallScore,
    }
    const markup = renderToStaticMarkup(
      <AtsScoreSheet score={summary as AtsScoreDetail} />
    )

    expect(markup).not.toContain("<button")
    expect(markup).toContain("65")
  })

  it("renders nothing for a CV never scored", () => {
    expect(renderToStaticMarkup(<AtsScoreSheet score={null} />)).toBe("")
  })
})

describe("ATS_FINDING_FIXES", () => {
  it("says what to change for every point the engine can raise", () => {
    expect(Object.keys(ATS_FINDING_FIXES).sort()).toEqual(
      Object.keys(ATS_FINDING_LABELS).sort()
    )
  })
})
