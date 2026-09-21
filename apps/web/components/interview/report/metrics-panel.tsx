"use client"

import type { InterviewReportMetric } from "@cvforge/types"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { metricLabels, scoreVerdict } from "@/lib/interview/labels"

const chartConfig = {
  score: { label: "Score", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * The five scored dimensions.
 *
 * The radar is `aria-hidden`: its shape says nothing to a screen reader and
 * its strokes do not carry the contrast a data point needs. The same numbers
 * are listed below in a description list — visible, not `sr-only`, because
 * that reads better for everyone and is the only keyboard-navigable form.
 */
export function MetricsPanel({ metrics }: { metrics: InterviewReportMetric[] }) {
  if (metrics.length === 0) return null

  const data = metrics.map((metric) => ({
    metric: metricLabels[metric.key] ?? metric.label,
    score: metric.score,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Par dimension</CardTitle>
        <CardDescription>Chaque axe noté sur 10.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div aria-hidden="true">
          <ChartContainer className="mx-auto max-h-64" config={chartConfig}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <Radar
                dataKey="score"
                fill="var(--color-score)"
                fillOpacity={0.5}
                stroke="var(--color-score)"
              />
            </RadarChart>
          </ChartContainer>
        </div>

        <dl className="grid gap-3 @2xl/main:grid-cols-2">
          {metrics.map((metric) => (
            <div className="rounded-lg border p-3" key={metric.key}>
              <dt className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {metricLabels[metric.key] ?? metric.label}
                </span>
                <span className="text-sm tabular-nums">
                  {metric.score}/10{" "}
                  <span className="text-xs text-muted-foreground">
                    {scoreVerdict(metric.score)}
                  </span>
                </span>
              </dt>
              <dd className="mt-1 text-xs text-muted-foreground">
                {metric.detail}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
