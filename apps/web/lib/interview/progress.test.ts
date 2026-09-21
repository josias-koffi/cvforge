import type {
  InterviewMetricTrend,
  InterviewProgressSummary,
} from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  buildProgressSeries,
  hasProgressData,
  toSeries,
} from "@/lib/interview/progress"

function makeTrend(
  overrides: Partial<InterviewMetricTrend> = {}
): InterviewMetricTrend {
  return {
    average: 7,
    delta: 1,
    key: "clarity",
    label: "raw label",
    points: [
      { completedAt: "2026-04-24T10:00:00.000Z", score: 6 },
      { completedAt: "2026-04-26T10:00:00.000Z", score: 8 },
    ],
    ...overrides,
  }
}

function makeProgress(
  overrides: Partial<InterviewProgressSummary> = {}
): InterviewProgressSummary {
  return {
    metrics: [makeTrend()],
    overallScoreAverage: 7,
    overallScoreDelta: 1,
    overallScorePoints: [
      { completedAt: "2026-04-24T10:00:00.000Z", score: 6 },
      { completedAt: "2026-04-26T10:00:00.000Z", score: 8 },
    ],
    sessionCount: 2,
    strengths: [],
    weaknesses: [],
    ...overrides,
  }
}

describe("toSeries", () => {
  it("prefers the French label over whatever the model returned", () => {
    expect(toSeries(makeTrend()).label).toBe("Clarté")
  })

  it("formats dates short enough for an axis", () => {
    expect(toSeries(makeTrend()).points[0]?.label).toMatch(/24 avr/)
  })

  it("survives an unparseable date instead of rendering NaN", () => {
    const series = toSeries(
      makeTrend({ points: [{ completedAt: "nonsense", score: 5 }] })
    )

    expect(series.points[0]?.label).toBe("—")
  })
})

describe("buildProgressSeries", () => {
  it("leads with the overall score, then the measured metrics", () => {
    const series = buildProgressSeries(makeProgress())

    expect(series.map((entry) => entry.key)).toEqual(["overall", "clarity"])
    expect(series[0]?.points).toHaveLength(2)
  })

  it("leaves out a metric no session ever scored", () => {
    // Plotting it as zero would claim a performance that never happened.
    const series = buildProgressSeries(
      makeProgress({
        metrics: [makeTrend(), makeTrend({ key: "pacing", points: [] })],
      })
    )

    expect(series.map((entry) => entry.key)).not.toContain("pacing")
  })
})

describe("hasProgressData", () => {
  it("is false until a session has been finished", () => {
    expect(hasProgressData(makeProgress({ sessionCount: 0 }))).toBe(false)
    expect(hasProgressData(makeProgress({ sessionCount: 1 }))).toBe(true)
  })
})
