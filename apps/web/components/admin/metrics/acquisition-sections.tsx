import { acquisitionTools, type AcquisitionMetrics } from "@cvforge/types"

import { FunnelCard } from "@/components/admin/metrics/funnel-card"
import {
  MetricsGrid,
  StatList,
} from "@/components/admin/metrics/metrics-section"
import {
  ChartSummary,
  MetricsTrendCard,
} from "@/components/admin/metrics/metrics-trend-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCount, formatRate, sumOf } from "@/lib/admin-metrics/format"
import { acquisitionToolLabels } from "@/lib/admin-metrics/labels"

/** One colour per tool; there are five tools and five chart colours. */
const TOOL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** Only the tools that had a visitor: an empty stack still takes a legend line. */
function visitorChart(series: AcquisitionMetrics["series"]) {
  const tools = acquisitionTools.filter((tool) => sumOf(series, tool) > 0)
  const config = Object.fromEntries(
    tools.map((tool) => [
      tool,
      {
        color:
          TOOL_COLORS[acquisitionTools.indexOf(tool) % TOOL_COLORS.length]!,
        label: acquisitionToolLabels[tool],
      },
    ])
  )
  const data = series.map((point) => ({
    date: point.date,
    ...Object.fromEntries(tools.map((tool) => [tool, point[tool] ?? 0])),
  }))

  return { config, data, tools }
}

/**
 * "Acquisition": the landing's free tools, from the visit to the account.
 * Their events are kept 90 days, so a longer period shows 90 days at most.
 */
export function AcquisitionSections({ data }: { data: AcquisitionMetrics }) {
  const chart = visitorChart(data.series)
  const total = chart.tools.reduce(
    (sum, tool) => sum + sumOf(data.series, tool),
    0
  )

  return (
    <MetricsGrid>
      <MetricsTrendCard
        bucket="day"
        config={chart.config}
        data={chart.data}
        description="Visiteurs uniques par jour et par outil, 90 jours au plus"
        footer={
          <ChartSummary>
            Sur la période : {formatCount(total)} visites
            {chart.tools.length > 0
              ? ` (${chart.tools
                  .map(
                    (tool) =>
                      `${acquisitionToolLabels[tool]} : ${formatCount(sumOf(data.series, tool))}`
                  )
                  .join(", ")}).`
              : "."}
          </ChartSummary>
        }
        series={chart.tools.map((key) => ({ key, stackId: "visitors" }))}
        title="Visiteurs des outils gratuits"
      />
      <PublicAtsCard ats={data.publicAts} />
      {data.funnels.map((funnel) => (
        <FunnelCard key={funnel.tool} funnel={funnel} />
      ))}
    </MetricsGrid>
  )
}

function PublicAtsCard({ ats }: { ats: AcquisitionMetrics["publicAts"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse ATS publique</CardTitle>
        <CardDescription>
          Les CV analysés sur la landing, et les rapports débloqués contre un
          email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StatList
          items={[
            { label: "Analyses", value: formatCount(ats.scans) },
            { label: "Rapports débloqués", value: formatCount(ats.unlocked) },
            { label: "Taux de déblocage", value: formatRate(ats.unlockRate) },
          ]}
        />
      </CardContent>
    </Card>
  )
}
