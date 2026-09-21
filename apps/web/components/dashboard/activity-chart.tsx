"use client"

import * as React from "react"

import { TrendCard } from "@/components/charts/trend-card"
import { type ChartConfig } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type ActivityPoint = { date: string; imported: number; documents: number }

const chartConfig = {
  imported: { label: "Candidatures créées", color: "var(--primary)" },
  documents: { label: "Documents générés", color: "var(--chart-3)" },
} satisfies ChartConfig

const ranges = [
  { label: "3 mois", value: "90" },
  { label: "30 jours", value: "30" },
  { label: "7 jours", value: "7" },
]

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
})
const longDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
})

export function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const [range, setRange] = React.useState("30")
  const visible = points.slice(-Number(range))
  const totals = visible.reduce(
    (sum, point) => ({
      documents: sum.documents + point.documents,
      imported: sum.imported + point.imported,
    }),
    { documents: 0, imported: 0 }
  )

  return (
    <TrendCard
      action={
        <ToggleGroup
          onValueChange={(value) => value && setRange(value)}
          size="sm"
          type="single"
          value={range}
          variant="outline"
        >
          {ranges.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
      config={chartConfig}
      data={visible}
      description="Candidatures créées et documents générés, jour après jour"
      // The chart is hidden from assistive tech, so the period has to add up
      // to something readable in words.
      footer={
        <p className="text-xs text-muted-foreground">
          Sur la période : {totals.imported} candidature
          {totals.imported > 1 ? "s" : ""} créée
          {totals.imported > 1 ? "s" : ""}, {totals.documents} document
          {totals.documents > 1 ? "s" : ""} généré
          {totals.documents > 1 ? "s" : ""}.
        </p>
      }
      series={[
        { key: "documents", stackId: "a" },
        { key: "imported", stackId: "a" },
      ]}
      title="Activité"
      tooltipLabelFormatter={(value) => longDayFormatter.format(new Date(String(value)))}
      xFormatter={(value) => dayFormatter.format(new Date(value))}
      xKey="date"
    />
  )
}
