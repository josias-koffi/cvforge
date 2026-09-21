import type {
  InterviewMetricTrend,
  InterviewProgressSummary,
} from "@cvforge/types"

import { metricLabels } from "@/lib/interview/labels"

export type ProgressPoint = {
  /** Short date for the axis, e.g. "24 avr.". */
  label: string
  score: number
}

export type ProgressSeries = {
  key: string
  label: string
  points: ProgressPoint[]
}

const axisFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
})

function toAxisLabel(iso: string) {
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? "—" : axisFormatter.format(date)
}

/**
 * Turns a trend into chart-ready points.
 *
 * Sessions that did not score a given metric are simply absent from its
 * series rather than plotted as zero — a gap is honest, a zero is a lie about
 * how the candidate performed.
 */
export function toSeries(trend: InterviewMetricTrend): ProgressSeries {
  return {
    key: trend.key,
    label: metricLabels[trend.key] ?? trend.label,
    points: trend.points.map((point) => ({
      label: toAxisLabel(point.completedAt),
      score: point.score,
    })),
  }
}

/** The overall score plus every metric that was measured at least once. */
export function buildProgressSeries(
  progress: InterviewProgressSummary
): ProgressSeries[] {
  return [
    {
      key: "overall",
      label: "Score global",
      points: progress.overallScorePoints.map((point) => ({
        label: toAxisLabel(point.completedAt),
        score: point.score,
      })),
    },
    ...progress.metrics.filter((m) => m.points.length > 0).map(toSeries),
  ]
}

/** Whether there is anything worth drawing yet. */
export function hasProgressData(progress: InterviewProgressSummary) {
  return progress.sessionCount > 0
}
