"use client"

import type { InterviewProgressSummary } from "@cvforge/types"

import { TrendCard } from "@/components/charts/trend-card"
import { type ChartConfig } from "@/components/ui/chart"
import { formatDelta } from "@/lib/interview/labels"
import { buildProgressSeries } from "@/lib/interview/progress"

const chartConfig = {
  score: { label: "Score global", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * The overall interview score, session by session.
 *
 * The dashboard's read on the interview practice: one line, no dimension
 * picker — the breakdown is a click away on the progress page, which owns it.
 */
export function InterviewScoreChart({
  progress,
}: {
  progress: InterviewProgressSummary
}) {
  const [overall] = buildProgressSeries(progress)
  if (!overall || overall.points.length === 0) return null

  return (
    <TrendCard
      config={chartConfig}
      data={overall.points.map((point) => ({ ...point }))}
      description="Vos scores d'entretien, session après session"
      footer={
        <p className="text-xs text-muted-foreground">
          Moyenne {progress.overallScoreAverage}/10 sur{" "}
          {progress.sessionCount} session{progress.sessionCount > 1 ? "s" : ""}{" "}
          — {formatDelta(progress.overallScoreDelta)} depuis la première.
        </p>
      }
      series={[{ key: "score" }]}
      title="Entretiens"
      xKey="label"
      yDomain={[0, 10]}
    />
  )
}
