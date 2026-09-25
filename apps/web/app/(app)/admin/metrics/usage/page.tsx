import type { UsageMetrics } from "@cvforge/types"
import type { Metadata } from "next"

import { UsageSections } from "@/components/admin/metrics/usage-sections"
import { loadMetrics } from "@/lib/admin-metrics/load"

export const metadata: Metadata = { title: "Produit · Pilotage" }

export default async function MetricsUsagePage(
  props: PageProps<"/admin/metrics/usage">
) {
  const data = await loadMetrics<UsageMetrics>("usage", props.searchParams)

  return <UsageSections data={data} />
}
