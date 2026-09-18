import type { Metadata } from "next"
import { DownloadIcon } from "lucide-react"

import { MetricsGrid } from "@/components/admin/metrics-grid"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import type { AdminMetrics, OpenRouterBalanceResponse } from "@/lib/metrics"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Métriques" }

export default async function AdminMetricsPage() {
  await requireAdminSession()

  const [metrics, balance] = await Promise.all([
    api<AdminMetrics>("/admin/metrics"),
    api<OpenRouterBalanceResponse>("/admin/metrics/openrouter-balance"),
  ])

  return (
    <>
      <PageHeader
        title="Métriques"
        description={`Usage du produit, revenus et coût API. Relevé du ${formatDateTime(metrics.generatedAt)}.`}
        actions={
          <Button asChild variant="outline">
            {/* A route handler, not a server action: the CSV streams straight
                from the API through the BFF. */}
            <a href="/admin/metrics/export" download>
              <DownloadIcon />
              Exporter en CSV
            </a>
          </Button>
        }
      />
      <MetricsGrid balance={balance} metrics={metrics} />
    </>
  )
}
