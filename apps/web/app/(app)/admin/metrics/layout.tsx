import { Suspense } from "react"

import { ExportButton } from "@/components/admin/metrics/export-button"
import { MetricsNav } from "@/components/admin/metrics/metrics-nav"
import { PeriodToggle } from "@/components/admin/metrics/period-toggle"
import { PageHeader } from "@/components/layout/page-header"
import { requireAdminSession } from "@/lib/session"

/**
 * "Pilotage", the owner's cockpit: one tab per question, one period for all
 * of them. The tabs, the period switch and the export read the period from
 * the URL on the client — a layout is not given the query string.
 */
export default async function MetricsLayout({
  children,
}: LayoutProps<"/admin/metrics">) {
  await requireAdminSession()

  return (
    <>
      <PageHeader
        title="Pilotage"
        description="Revenus, coûts IA, usage, marché et acquisition, sur la période choisie."
        actions={
          <Suspense>
            <ExportButton />
          </Suspense>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <Suspense>
            <MetricsNav />
            <PeriodToggle />
          </Suspense>
        </div>
        {children}
      </div>
    </>
  )
}
