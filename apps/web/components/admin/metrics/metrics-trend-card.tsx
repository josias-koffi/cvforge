"use client"

import type { MetricsBucket } from "@cvforge/types"

import { TrendCard, type TrendSeries } from "@/components/charts/trend-card"
import type { ChartConfig } from "@/components/ui/chart"
import { formatBucket, formatBucketLong } from "@/lib/admin-metrics/format"

/**
 * TrendCard with the cockpit's date axis. The sections are server
 * components and cannot hand a formatter function to a client one, so the
 * bucket — day, week or month — crosses the boundary instead.
 */
export function MetricsTrendCard({
  bucket,
  config,
  data,
  description,
  footer,
  series,
  title,
}: {
  bucket: MetricsBucket
  config: ChartConfig
  data: Record<string, unknown>[]
  description: React.ReactNode
  footer: React.ReactNode
  series: TrendSeries[]
  title: string
}) {
  return (
    <TrendCard
      config={config}
      data={data}
      description={description}
      footer={footer}
      series={series}
      title={title}
      tooltipLabelFormatter={(value) => formatBucketLong(String(value), bucket)}
      xFormatter={(value) => formatBucket(value, bucket)}
      xKey="date"
    />
  )
}

/** The text under a chart: the chart is aria-hidden, this is what it says. */
export function ChartSummary({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
