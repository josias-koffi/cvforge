import type { MarketMetrics } from "@cvforge/types"
import type { Metadata } from "next"

import { MarketSections } from "@/components/admin/metrics/market-sections"
import { loadMetrics } from "@/lib/admin-metrics/load"

export const metadata: Metadata = { title: "Marché · Pilotage" }

export default async function MetricsMarketPage(
  props: PageProps<"/admin/metrics/marche">
) {
  const data = await loadMetrics<MarketMetrics>("market", props.searchParams)

  return <MarketSections data={data} />
}
