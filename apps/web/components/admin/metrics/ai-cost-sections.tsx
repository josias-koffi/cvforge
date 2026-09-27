import type { AiCostMetrics } from "@cvforge/types"
import {
  ActivityIcon,
  BotIcon,
  CircleDollarSignIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  FeaturesTable,
  ModelsTable,
  UnitEconomicsTable,
} from "@/components/admin/metrics/ai-cost-tables"
import { KpiRow, type KpiItem } from "@/components/admin/metrics/kpi-row"
import { MetricsGrid } from "@/components/admin/metrics/metrics-section"
import {
  ChartSummary,
  MetricsTrendCard,
} from "@/components/admin/metrics/metrics-trend-card"
import { OpenRouterBalanceCard } from "@/components/admin/metrics/openrouter-balance-card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { featureCostChart } from "@/lib/admin-metrics/ai-cost-series"
import {
  formatCount,
  formatEurCents,
  formatRate,
  formatUsd,
  usdToEurCents,
} from "@/lib/admin-metrics/format"
import { periodPhrases } from "@/lib/admin-metrics/period"
import { formatDate } from "@/lib/format"

function aiCostKpis({ kpis, usdToEurRate }: AiCostMetrics): KpiItem[] {
  return [
    {
      hint: `≈ ${formatEurCents(usdToEurCents(kpis.costUsd.value, usdToEurRate))}`,
      icon: CircleDollarSignIcon,
      kpi: kpis.costUsd,
      label: "Coût IA",
      tone: "warning",
      upIsBad: true,
      value: formatUsd(kpis.costUsd.value),
    },
    {
      icon: ActivityIcon,
      kpi: kpis.calls,
      label: "Appels",
      tone: "info",
      value: formatCount(kpis.calls.value),
    },
    {
      icon: TriangleAlertIcon,
      kpi: kpis.errorRate,
      label: "Taux d'erreur",
      tone: "destructive",
      upIsBad: true,
      value: formatRate(kpis.errorRate.value),
    },
    {
      icon: BotIcon,
      kpi: kpis.averageCallCostUsd,
      label: "Coût moyen par appel",
      tone: "primary",
      upIsBad: true,
      value: formatUsd(kpis.averageCallCostUsd.value),
    },
  ]
}

/**
 * "Coûts IA": what the AI costs, what for, on which model, and whether each
 * billed unit still earns more than it costs.
 */
export function AiCostSections({ data }: { data: AiCostMetrics }) {
  if (data.trackingSince === null) return <NotTrackedYet data={data} />

  const { bucket, period } = data.window
  const chart = featureCostChart(data.series)

  return (
    <>
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        Suivi depuis le {formatDate(data.trackingSince)}. Montants OpenRouter en
        dollars, convertis au taux fixe de {data.usdToEurRate} € pour 1 $.
      </p>
      <KpiRow items={aiCostKpis(data)} />
      <MetricsGrid>
        <MetricsTrendCard
          bucket={bucket}
          config={chart.config}
          data={chart.data}
          description={`Coût en dollars par usage, ${periodPhrases[period]}`}
          footer={
            <ChartSummary>
              Sur la période : {formatUsd(data.kpis.costUsd.value)} pour{" "}
              {formatCount(data.kpis.calls.value)} appels
              {data.features[0]
                ? `, dont ${formatUsd(topFeatureCost(data))} pour l'usage le plus coûteux.`
                : "."}
            </ChartSummary>
          }
          series={chart.keys.map((key) => ({ key, stackId: "cost" }))}
          title="Coût par usage"
        />
        <OpenRouterBalanceCard balance={data.balance} />
        <div className="@3xl/main:col-span-2">
          <UnitEconomicsTable units={data.units} />
        </div>
        <FeaturesTable features={data.features} />
        <ModelsTable models={data.models} />
      </MetricsGrid>
    </>
  )
}

function topFeatureCost({ features }: AiCostMetrics) {
  return features.reduce((top, row) => Math.max(top, row.costUsd), 0)
}

/** Before the first tagged call there is nothing to chart; the balance still helps. */
function NotTrackedYet({ data }: { data: AiCostMetrics }) {
  return (
    <MetricsGrid>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BotIcon />
          </EmptyMedia>
          <EmptyTitle>Aucun appel IA enregistré</EmptyTitle>
          <EmptyDescription>
            Le coût de chaque appel est suivi à partir du premier appel
            enregistré. Les appels plus anciens n&apos;ont jamais été mesurés.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <OpenRouterBalanceCard balance={data.balance} />
    </MetricsGrid>
  )
}
