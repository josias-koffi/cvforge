import type { Metadata } from "next"
import Link from "next/link"
import type {
  ApplicationsKpiSummary,
  CreditLedgerSummary,
  DraftApplication,
  InterviewProgressSummary,
  InterviewSessionListItem,
} from "@cvforge/types"
import { ArrowRightIcon, PlusIcon } from "lucide-react"

import { AtsScansPanel } from "@/components/ats/ats-scans-panel"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { InterviewScoreChart } from "@/components/dashboard/interview-score-chart"
import { SectionCards } from "@/components/dashboard/section-cards"
import { SessionsTable } from "@/components/interview/sessions-table"
import { PageHeader } from "@/components/layout/page-header"
import { OffersTable } from "@/components/offers/offers-table"
import { Button } from "@/components/ui/button"
import { buildActivitySeries } from "@/lib/activity"
import { api } from "@/lib/api"
import type { AtsScanSummary } from "@/lib/ats-report"
import { hasProgressData } from "@/lib/interview/progress"

export const metadata: Metadata = { title: "Tableau de bord" }

/** A section with its own heading and a way through to the full list. */
function Panel({
  children,
  href,
  linkLabel,
  title,
}: {
  children: React.ReactNode
  href: string
  linkLabel: string
  title: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button asChild size="sm" variant="ghost">
          <Link href={href}>
            {linkLabel}
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
      {children}
    </section>
  )
}

export default async function DashboardPage() {
  // The interview calls are optional: a dashboard that 500s because the
  // practice history is unavailable helps nobody.
  const [{ summary }, { applications }, credits, interviews, sessions, ats] =
    await Promise.all([
      api<{ summary: ApplicationsKpiSummary }>("/applications/summary"),
      api<{ applications: DraftApplication[] }>("/applications"),
      api<{ credits: CreditLedgerSummary }>("/credits/me").catch(() => null),
      api<{ progress: InterviewProgressSummary }>("/interviews/progress").catch(
        () => null
      ),
      api<{ sessions: InterviewSessionListItem[] }>("/interviews/sessions").catch(
        () => null
      ),
      api<{ scans: AtsScanSummary[] }>("/ats/scans").catch(() => null),
    ])

  const recent = [...applications]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5)
  const progress = interviews?.progress ?? null
  const recentSessions = (sessions?.sessions ?? []).slice(0, 5)

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vos candidatures et vos entretiens en un coup d'œil. Une nouvelle offre ? Une étincelle suffit."
        actions={
          <Button asChild>
            <Link href="/candidatures/new">
              <PlusIcon />
              Nouvelle candidature
            </Link>
          </Button>
        }
      />

      <SectionCards
        balance={credits?.credits.balance ?? null}
        interviews={progress}
        summary={summary}
      />

      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-2">
        <ActivityChart points={buildActivitySeries(applications)} />
        {progress && hasProgressData(progress) ? (
          <InterviewScoreChart progress={progress} />
        ) : null}
      </div>

      <div className="grid gap-6 px-4 lg:px-6">
        <AtsScansPanel scans={ats?.scans ?? []} />

        <Panel
          href="/candidatures"
          linkLabel="Toutes les candidatures"
          title="Candidatures récentes"
        >
          <OffersTable offers={recent} pageSize={5} showToolbar={false} />
        </Panel>

        {recentSessions.length > 0 ? (
          <Panel
            href="/entretiens"
            linkLabel="Tous les entretiens"
            title="Entretiens récents"
          >
            <SessionsTable pageSize={5} sessions={recentSessions} />
          </Panel>
        ) : null}
      </div>
    </>
  )
}
