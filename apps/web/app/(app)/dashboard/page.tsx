import type { Metadata } from "next"
import Link from "next/link"
import type {
  ApplicationsKpiSummary,
  CreditLedgerSummary,
  DraftApplication,
} from "@cvforge/types"
import { ArrowRightIcon, PlusIcon } from "lucide-react"

import { ActivityChart } from "@/components/dashboard/activity-chart"
import { SectionCards } from "@/components/dashboard/section-cards"
import { PageHeader } from "@/components/layout/page-header"
import { OffersTable } from "@/components/offers/offers-table"
import { Button } from "@/components/ui/button"
import { buildActivitySeries } from "@/lib/activity"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Tableau de bord" }

export default async function DashboardPage() {
  const [{ summary }, { applications }, credits] = await Promise.all([
    api<{ summary: ApplicationsKpiSummary }>("/applications/summary"),
    api<{ applications: DraftApplication[] }>("/applications"),
    api<{ credits: CreditLedgerSummary }>("/credits/me").catch(() => null),
  ])
  const recent = [...applications]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5)

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vos candidatures en un coup d'œil. Une nouvelle offre ? Une étincelle suffit."
        actions={
          <Button asChild>
            <Link href="/offers/new">
              <PlusIcon />
              Nouvelle offre
            </Link>
          </Button>
        }
      />
      <SectionCards summary={summary} balance={credits?.credits.balance ?? null} />
      <div className="px-4 lg:px-6">
        <ActivityChart points={buildActivitySeries(applications)} />
      </div>
      <section className="flex flex-col gap-3 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Offres récentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/offers">
              Toutes les offres
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
        <OffersTable offers={recent} showToolbar={false} pageSize={5} />
      </section>
    </>
  )
}
