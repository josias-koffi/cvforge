"use client"

import { DownloadIcon } from "lucide-react"

import { usePeriod } from "@/components/admin/metrics/use-period"
import { Button } from "@/components/ui/button"
import { withPeriod } from "@/lib/admin-metrics/period"

/** Base URL of the CSV route handler; the period is appended when not default. */
export const EXPORT_HREF = "/admin/metrics/export"

/**
 * The CSV of the period on screen. A route handler, not a server action: the
 * file streams straight from the API through the BFF.
 */
export function ExportButton() {
  const period = usePeriod()

  return (
    <Button asChild variant="outline">
      <a download href={withPeriod(EXPORT_HREF, period)}>
        <DownloadIcon />
        Exporter en CSV
      </a>
    </Button>
  )
}
