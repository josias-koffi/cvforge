import type { RevenueMetrics } from "@cvforge/types"
import type { Metadata } from "next"

import { RevenueSections } from "@/components/admin/metrics/revenue-sections"
import { loadMetrics } from "@/lib/admin-metrics/load"

export const metadata: Metadata = { title: "Revenus · Pilotage" }

export default async function MetricsRevenuePage(
  props: PageProps<"/admin/metrics/revenus">
) {
  const data = await loadMetrics<RevenueMetrics>("revenue", props.searchParams)

  return <RevenueSections data={data} />
}
