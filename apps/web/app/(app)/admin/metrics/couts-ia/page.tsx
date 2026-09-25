import type { AiCostMetrics } from "@cvforge/types"
import type { Metadata } from "next"

import { AiCostSections } from "@/components/admin/metrics/ai-cost-sections"
import { loadMetrics } from "@/lib/admin-metrics/load"

export const metadata: Metadata = { title: "Coûts IA · Pilotage" }

export default async function MetricsAiCostPage(
  props: PageProps<"/admin/metrics/couts-ia">
) {
  const data = await loadMetrics<AiCostMetrics>("ai-costs", props.searchParams)

  return <AiCostSections data={data} />
}
