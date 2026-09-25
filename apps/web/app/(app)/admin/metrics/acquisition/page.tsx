import type { AcquisitionMetrics } from "@cvforge/types"
import type { Metadata } from "next"

import { AcquisitionSections } from "@/components/admin/metrics/acquisition-sections"
import { loadMetrics } from "@/lib/admin-metrics/load"

export const metadata: Metadata = { title: "Acquisition · Pilotage" }

export default async function MetricsAcquisitionPage(
  props: PageProps<"/admin/metrics/acquisition">
) {
  const data = await loadMetrics<AcquisitionMetrics>(
    "acquisition",
    props.searchParams
  )

  return <AcquisitionSections data={data} />
}
