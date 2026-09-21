import type { InterviewSessionSummary } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { MetricsPanel } from "@/components/interview/report/metrics-panel"
import { ReportCard } from "@/components/interview/report/report-card"
import { TranscriptStats } from "@/components/interview/report/transcript-stats"
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
import { formatDate, formatTime } from "@/lib/format"
import { profileLabels } from "@/lib/interview/labels"

export const metadata: Metadata = { title: "Rapport d'entretien" }

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

      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <ReportCard report={report} />
          <MetricsPanel metrics={report.metrics} />
          <Card>
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
              <CardDescription>
                Ce qui a été dit, dans l&apos;ordre. L&apos;audio n&apos;est
                jamais conservé.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {session.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun échange enregistré.
                </p>
              ) : (
                session.messages.map((message) => (
                  <p
                    className="text-sm"
                    key={`${message.timestamp}-${message.role}`}
                  >
                    <time
                      className="mr-2 text-xs tabular-nums text-muted-foreground"
                      dateTime={message.timestamp}
                    >
                      {formatTime(message.timestamp)}
                    </time>
                    <span className="font-medium">
                      {message.role === "user" ? "Vous" : "Recruteur"} :{" "}
                    </span>
                    <span className="text-muted-foreground">
                      {message.content}
                    </span>
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <TranscriptStats
          hasLinkedOffer={session.applicationId !== null}
          stats={report.transcriptStats}
        />
      </div>
    </>
  )
}
