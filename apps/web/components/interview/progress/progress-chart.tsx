"use client"

import type { InterviewProgressSummary } from "@cvforge/types"
import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
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
 * The figures are also listed below the chart: a line is a quick read, but it
 * is not accessible on its own, and two sessions rarely make a trend worth
 * squinting at.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution</CardTitle>
        <CardDescription>
          Sur vos {progress.sessionCount} dernière
          {progress.sessionCount > 1 ? "s" : ""} session
          {progress.sessionCount > 1 ? "s" : ""} terminée
          {progress.sessionCount > 1 ? "s" : ""}.
        </CardDescription>
        <CardAction>
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
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div aria-hidden="true">
          <ChartContainer className="max-h-64 w-full" config={chartConfig}>
            <LineChart data={current.points} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="label" tickLine={false} />
              <YAxis
                axisLine={false}
                domain={[0, 10]}
                tickCount={6}
                tickLine={false}
                width={24}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="score"
                dot
                stroke="var(--color-score)"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        </div>

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
      </CardContent>
    </Card>
  )
}
