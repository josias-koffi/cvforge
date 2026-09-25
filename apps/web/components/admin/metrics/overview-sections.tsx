import type { OverviewMetrics } from "@cvforge/types"
import {
  BotIcon,
  EuroIcon,
  PiggyBankIcon,
  ShoppingBagIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import { InsightsPanel } from "@/components/admin/metrics/insights-panel"
import { KpiRow, type KpiItem } from "@/components/admin/metrics/kpi-row"
import { MetricsGrid } from "@/components/admin/metrics/metrics-section"
import {
  ChartSummary,
  MetricsTrendCard,
} from "@/components/admin/metrics/metrics-trend-card"
import {
  centsToUnits,
  formatCount,
  formatEurCents,
  sumOf,
} from "@/lib/admin-metrics/format"
import { periodPhrases } from "@/lib/admin-metrics/period"

const REVENUE_CONFIG = {
  revenue: { color: "var(--primary)", label: "Chiffre d'affaires (€)" },
  aiCost: { color: "var(--chart-3)", label: "Coût IA (€)" },
}

const USERS_CONFIG = {
  signups: { color: "var(--chart-1)", label: "Inscrits" },
  activeUsers: { color: "var(--chart-4)", label: "Actifs" },
}

function overviewKpis({ kpis }: OverviewMetrics): KpiItem[] {
  return [
    {
      icon: EuroIcon,
      kpi: kpis.revenueCents,
      label: "Chiffre d'affaires",
      tone: "primary",
      value: formatEurCents(kpis.revenueCents.value),
    },
    {
      icon: BotIcon,
      kpi: kpis.aiCostEurCents,
      label: "Coût IA",
      tone: "warning",
      upIsBad: true,
      value: formatEurCents(kpis.aiCostEurCents.value),
    },
    {
      icon: PiggyBankIcon,
      kpi: kpis.grossMarginCents,
      label: "Marge brute",
      tone: "success",
      hint: "CA moins coût IA",
      value: formatEurCents(kpis.grossMarginCents.value),
    },
    {
      icon: UserPlusIcon,
      kpi: kpis.signups,
      label: "Inscrits",
      tone: "info",
      value: formatCount(kpis.signups.value),
    },
    {
      icon: UsersIcon,
      kpi: kpis.activeUsers,
      label: "Comptes actifs",
      tone: "info",
      value: formatCount(kpis.activeUsers.value),
    },
    {
      icon: ShoppingBagIcon,
      kpi: kpis.newBuyers,
      label: "Nouveaux acheteurs",
      tone: "spark",
      hint: "Premier achat sur la période",
      value: formatCount(kpis.newBuyers.value),
    },
  ]
}

/**
 * "Vue d'ensemble": is the business healthy over the period? Money in, money
 * out to the AI, people coming and staying, and what stands out.
 */
export function OverviewSections({ data }: { data: OverviewMetrics }) {
  const { bucket, period } = data.window
  // Charted in euros: the tooltip prints the raw value.
  const money = data.revenueVsCost.map((point) => ({
    aiCost: centsToUnits(point.aiCostCents),
    date: point.date,
    revenue: centsToUnits(point.revenueCents),
  }))

  return (
    <>
      <KpiRow items={overviewKpis(data)} />
      <MetricsGrid>
        <MetricsTrendCard
          bucket={bucket}
          config={REVENUE_CONFIG}
          data={money}
          description={`Encaissé et dépensé en IA, ${periodPhrases[period]}`}
          footer={
            <ChartSummary>
              Sur la période :{" "}
              {formatEurCents(sumOf(data.revenueVsCost, "revenueCents"))}{" "}
              encaissés,{" "}
              {formatEurCents(sumOf(data.revenueVsCost, "aiCostCents"))} de coût
              IA.
            </ChartSummary>
          }
          series={[{ key: "revenue" }, { key: "aiCost" }]}
          title="CA et coût IA"
        />
        <MetricsTrendCard
          bucket={bucket}
          config={USERS_CONFIG}
          data={data.signupsVsActive}
          description={`Nouveaux comptes et comptes actifs, ${periodPhrases[period]}`}
          footer={
            <ChartSummary>
              Sur la période : {formatCount(data.kpis.signups.value)} inscrits,{" "}
              {formatCount(data.kpis.activeUsers.value)} comptes actifs.
            </ChartSummary>
          }
          series={[{ key: "activeUsers" }, { key: "signups" }]}
          title="Inscrits et actifs"
        />
      </MetricsGrid>
      <div className="px-4 lg:px-6">
        <InsightsPanel insights={data.insights} period={period} />
      </div>
    </>
  )
}
