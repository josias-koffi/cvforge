import type { OverviewMetrics } from "@cvforge/types"
import type { Metadata } from "next"

import { OverviewSections } from "@/components/admin/metrics/overview-sections"
import { loadMetrics } from "@/lib/admin-metrics/load"

export const metadata: Metadata = { title: "Pilotage" }

export default async function MetricsOverviewPage(
  props: PageProps<"/admin/metrics">
) {
  const data = await loadMetrics<OverviewMetrics>(
    "overview",
    props.searchParams
  )

  return <OverviewSections data={data} />
}
