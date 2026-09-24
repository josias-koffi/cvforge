import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MetricsGrid } from "@/components/admin/metrics-grid"
import type { AdminMetrics, OpenRouterBalanceResponse } from "@/lib/metrics"

const BALANCE: OpenRouterBalanceResponse = {
  alertThreshold: 5,
  balance: null,
  isLowBalance: false,
  supervisionEnabled: false,
}

function makeMetrics(ats: Partial<AdminMetrics["ats"]> = {}): AdminMetrics {
  return {
    acquisition: [
      {
        accountsActivated: 0,
        ctaClicks: 0,
        emailsSubmitted: 0,
        results: 0,
        tool: "ats",
        visitors: 0,
      },
    ],
    activeWindowDays: 30,
    apiCost: null,
    applications: { totalCount: 0 },
    ats: {
      conversionRate: null,
      convertedLeadCount: 0,
      publicScanCount: 0,
      scoresByEngine: [],
      unlockRate: null,
      unlockedScanCount: 0,
      ...ats,
    },
    credits: { consumed: 0, granted: 0, sold: 0 },
    documents: {
      cvImportCount: 0,
      generatedCvCount: 0,
      generatedLetterCount: 0,
      offerEnrichmentCount: 0,
    },
    generatedAt: "2026-09-22T12:00:00.000Z",
    interviews: { completedCount: 0, totalCount: 0 },
    margin: null,
    revenue: { currency: "eur", grossCents: 0, paidOrderCount: 0 },
    users: { activeCount: 0, adminCount: 0, totalCount: 0 },
  }
}

function render(ats: Partial<AdminMetrics["ats"]> = {}) {
  return renderToStaticMarkup(
    <MetricsGrid balance={BALANCE} metrics={makeMetrics(ats)} />
  )
}

describe("MetricsGrid — ATS funnel", () => {
  it("reports the scans, the unlocks and the conversions", () => {
    const markup = render({
      conversionRate: 50,
      convertedLeadCount: 4,
      publicScanCount: 120,
      unlockRate: 7,
      unlockedScanCount: 8,
    })

    expect(markup).toContain("Analyses ATS publiques")
    expect(markup).toContain("120")
    expect(markup).toContain("8")
    expect(markup).toContain("7 %")
    expect(markup).toContain("50 %")
  })

  /**
   * A 0 % on an empty funnel reads as a failure; "no scans yet" and "nobody
   * converted" are different facts.
   */
  it("shows no percentage at all when there is nothing to divide", () => {
    const markup = render()

    expect(markup).toContain("Analyses ATS publiques")
    expect(markup).not.toContain("%")
  })
})

describe("MetricsGrid — free tool funnels", () => {
  it("shows one funnel card per tool, over the dashboard window", () => {
    expect(render()).toContain("Tunnel · Analyse ATS (30 j)")
  })
})

describe("MetricsGrid — average ATS score", () => {
  /** Pooling two scales would measure the rescale, not the CVs (ADR-021). */
  it("breaks the average down by engine version", () => {
    const markup = render({
      scoresByEngine: [
        { averageScore: 71, engineVersion: "1.1.0", scoredCvCount: 12 },
        { averageScore: 88, engineVersion: "1.0.0", scoredCvCount: 3 },
      ],
    })

    expect(markup).toContain("Barème 1.1.0 (12 CV)")
    expect(markup).toContain("Barème 1.0.0 (3 CV)")
    expect(markup).toContain("71")
    expect(markup).toContain("88")
  })

  it("shows a dash rather than a zero when nothing has been scored", () => {
    const markup = render()

    expect(markup).toContain("Score ATS moyen")
    expect(markup).toContain("—")
  })
})
