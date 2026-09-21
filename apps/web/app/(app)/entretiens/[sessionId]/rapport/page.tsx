import type { InterviewSessionSummary } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ChartLineIcon,
  FileTextIcon,
  MicIcon,
  type LucideIcon,
} from "lucide-react"

import { MetricsPanel } from "@/components/interview/report/metrics-panel"
import { ReportCard } from "@/components/interview/report/report-card"
import { ReportStats } from "@/components/interview/report/report-stats"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError, api } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { profileLabels } from "@/lib/interview/labels"

export const metadata: Metadata = { title: "Rapport d'entretien" }

function NextStep({
  description,
  href,
  icon: Icon,
  label,
}: {
  description: string
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
      href={href}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  )
}

export default async function InterviewReportPage({
  params,
}: PageProps<"/entretiens/[sessionId]/rapport">) {
  const { sessionId } = await params

  let session: InterviewSessionSummary
  try {
    session = await api<InterviewSessionSummary>(
      `/interviews/sessions/${encodeURIComponent(sessionId)}`
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  // A session without a report was never finished; there is nothing to show.
  if (!session.report) notFound()

  const report = session.report

  return (
    <>
      <PageHeader
        actions={
          <div className="flex gap-2">
            {session.applicationId ? (
              <Button asChild variant="outline">
                <Link href={`/candidatures/${session.applicationId}`}>
                  Voir la candidature
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/entretiens">Retour aux entretiens</Link>
            </Button>
          </div>
        }
        description={`Entretien ${profileLabels[session.profile].toLowerCase()} du ${formatDate(
          session.completedAt ?? session.createdAt
        )}.`}
        title="Rapport d'entretien"
      />

      <ReportStats
        hasLinkedOffer={session.applicationId !== null}
        stats={report.transcriptStats}
      />

      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <ReportCard report={report} />
          <MetricsPanel metrics={report.metrics} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Et maintenant ?</CardTitle>
            <CardDescription>
              Le rapport ne vaut que par ce qu&apos;on en fait.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {/* The transcript lives on the session's own page now: it made
                this report twice as long for something read once. */}
            <NextStep
              description="Relire l'échange, horodaté"
              href={`/entretiens/${sessionId}`}
              icon={FileTextIcon}
              label="Détail de l'entretien"
            />
            <NextStep
              description="Voir l'évolution de vos scores"
              href="/entretiens/progression"
              icon={ChartLineIcon}
              label="Ma progression"
            />
            <NextStep
              description="Retravailler les points faibles à chaud"
              href="/entretiens/new"
              icon={MicIcon}
              label="Refaire un entretien"
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
