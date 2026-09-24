import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AtsReport } from "@/components/ats/ats-report"
import { AtsScansPanel } from "@/components/ats/ats-scans-panel"
import type { AtsScanReport } from "@/lib/ats-report"

const REPORT: AtsScanReport = {
  band: "good",
  expiresAt: "2026-10-24T10:00:00.000Z",
  overallScore: 72,
  result: {
    dimensions: [
      { key: "structure", score: 80, status: "scored" },
      { key: "keywords", score: null, status: "unavailable" },
    ],
    engineVersion: "1.1.0",
    findings: [
      {
        code: "MISSING_LINKEDIN",
        dimension: "contactability",
        severity: "info",
      },
      {
        code: "NO_TEXT_LAYER",
        dimension: "machineReadability",
        severity: "critical",
      },
    ],
  },
  scanId: "3f2b8c1e-5d4a-4b6f-9a8e-1c2d3e4f5a6b",
  unlockedAt: "2026-09-24T10:00:00.000Z",
}

describe("AtsReport", () => {
  it("writes each criterion's score, and says when one was not evaluated", () => {
    const markup = renderToStaticMarkup(<AtsReport report={REPORT} />)

    expect(markup).toContain("Structure et sections")
    expect(markup).toContain("80 / 100")
    expect(markup).toContain("Non évalué")
  })

  /** A criterion nobody could measure is not a zero. */
  it("draws no bar for a criterion that was not evaluated", () => {
    const markup = renderToStaticMarkup(<AtsReport report={REPORT} />)

    expect(markup.match(/aria-hidden="true" class="mt-1.5/g)).toHaveLength(1)
  })

  it("lists the critical points first, with their severity in words", () => {
    const markup = renderToStaticMarkup(<AtsReport report={REPORT} />)

    expect(markup.indexOf("Critique")).toBeLessThan(markup.indexOf("À savoir"))
    expect(markup).toContain("Aucun profil LinkedIn détecté")
  })

  it("says so when nothing was found", () => {
    const markup = renderToStaticMarkup(
      <AtsReport
        report={{ ...REPORT, result: { ...REPORT.result, findings: [] } }}
      />
    )

    expect(markup).toContain("Aucun point à corriger")
  })
})

describe("AtsScansPanel", () => {
  it("links each report and says until when it can be read", () => {
    const markup = renderToStaticMarkup(<AtsScansPanel scans={[REPORT]} />)

    expect(markup).toContain(`href="/analyses-ats/${REPORT.scanId}"`)
    expect(markup).toContain("Consultable jusqu")
    expect(markup).toContain("72")
  })

  it("shows at most three reports", () => {
    const scans = Array.from({ length: 5 }, (_, index) => ({
      ...REPORT,
      scanId: `scan-${index}`,
    }))

    expect(
      renderToStaticMarkup(<AtsScansPanel scans={scans} />).match(/<li>/g)
    ).toHaveLength(3)
  })

  it("renders nothing without reports", () => {
    expect(renderToStaticMarkup(<AtsScansPanel scans={[]} />)).toBe("")
  })
})
