"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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

export type TrendSeries = {
  /** Key in both `config` and each data row. */
  key: string
  /** Stacked series share one id; leave unset for a standalone area. */
  stackId?: string
}

/**
 * The one chart card in the product.
 *
 * Every trend — applications on the dashboard, interview scores on the
 * dashboard and on the progress page — is drawn by this component, so the
 * gradient, the grid, the tooltip and the height are decided once. A second
 * chart style was what made the interview pages look like a different app.
 *
 * The chart itself is `aria-hidden`: its strokes do not carry the contrast a
 * data point needs. Callers pass `footer` with the same figures in text,
 * visible rather than `sr-only` because that reads better for everyone.
 */
export function TrendCard({
  title,
  description,
  config,
  data,
  series,
  xKey,
  xFormatter,
  tooltipLabelFormatter,
  yDomain,
  action,
  footer,
}: {
  title: string
  description: React.ReactNode
  config: ChartConfig
  data: Record<string, unknown>[]
  series: TrendSeries[]
  xKey: string
  xFormatter?: (value: string) => string
  tooltipLabelFormatter?: (value: unknown) => string
  yDomain?: [number, number]
  action?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-2 pt-4 sm:px-6 sm:pt-6">
        <div aria-hidden="true">
          <ChartContainer
            className="aspect-auto h-60 w-full"
            config={config}
          >
            <AreaChart data={data}>
              <defs>
                {series.map(({ key }) => (
                  <linearGradient
                    id={`fill-${key}`}
                    key={key}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey={xKey}
                minTickGap={32}
                tickFormatter={xFormatter}
                tickLine={false}
                tickMargin={8}
              />
              {yDomain ? (
                <YAxis
                  axisLine={false}
                  domain={yDomain}
                  tickCount={6}
                  tickLine={false}
                  width={28}
                />
              ) : null}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={tooltipLabelFormatter}
                  />
                }
                cursor={false}
              />
              {series.map(({ key, stackId }) => (
                <Area
                  dataKey={key}
                  fill={`url(#fill-${key})`}
                  key={key}
                  stackId={stackId}
                  stroke={`var(--color-${key})`}
                  type="monotone"
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </div>

        {footer}
      </CardContent>
    </Card>
  )
}
