"use client"

import type { InterviewProgressSummary } from "@cvforge/types"
import * as React from "react"

import { TrendCard } from "@/components/charts/trend-card"
import { type ChartConfig } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildProgressSeries } from "@/lib/interview/progress"

const chartConfig = {
  score: { label: "Score", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * One dimension at a time, over the recent sessions.
 *
 * Drawn by the same card as the dashboard's activity chart — same gradient,
 * same grid, same height — so moving between the two pages does not feel like
 * moving between two products. The figures are also listed below: a line is a
 * quick read, but it is not accessible on its own, and two sessions rarely
 * make a trend worth squinting at.
 */
export function ProgressChart({
  progress,
}: {
  progress: InterviewProgressSummary
}) {
  const series = React.useMemo(() => buildProgressSeries(progress), [progress])
  const [selected, setSelected] = React.useState("overall")
  const current = series.find((entry) => entry.key === selected) ?? series[0]

  if (!current) return null

  const plural = progress.sessionCount > 1 ? "s" : ""

  return (
    <TrendCard
      action={
        <Select onValueChange={setSelected} value={current.key}>
          <SelectTrigger aria-label="Dimension à afficher" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {series.map((entry) => (
              <SelectItem key={entry.key} value={entry.key}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      config={chartConfig}
      data={current.points.map((point) => ({ ...point }))}
      description={`Sur vos ${progress.sessionCount} dernière${plural} session${plural} terminée${plural}.`}
      footer={
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {current.points.map((point, index) => (
            <li key={`${point.label}-${index}`}>
              {point.label} :{" "}
              <span className="tabular-nums text-foreground">
                {point.score}/10
              </span>
            </li>
          ))}
        </ol>
      }
      series={[{ key: "score" }]}
      title="Évolution"
      xKey="label"
      yDomain={[0, 10]}
    />
  )
}
