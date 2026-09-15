"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type ActivityPoint = { date: string; imported: number; documents: number }

const chartConfig = {
  imported: { label: "Offres importées", color: "var(--primary)" },
  documents: { label: "Documents générés", color: "var(--chart-3)" },
} satisfies ChartConfig

const ranges = [
  { days: 90, label: "3 mois", value: "90" },
  { days: 30, label: "30 jours", value: "30" },
  { days: 7, label: "7 jours", value: "7" },
]

export function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const [range, setRange] = React.useState("30")
  const visible = points.slice(-Number(range))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Activité</CardTitle>
        <CardDescription>
          Offres importées et documents générés, jour après jour
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => value && setRange(value)}
            variant="outline"
            size="sm"
          >
            {ranges.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <AreaChart data={visible}>
            <defs>
              {Object.keys(chartConfig).map((key) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) =>
                    new Date(String(value)).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })
                  }
                />
              }
            />
            <Area
              dataKey="documents"
              type="monotone"
              fill="url(#fill-documents)"
              stroke="var(--color-documents)"
              stackId="a"
            />
            <Area
              dataKey="imported"
              type="monotone"
              fill="url(#fill-imported)"
              stroke="var(--color-imported)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
