import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { AtsScoreBadge } from "@/components/applications/ats-score-badge"
import { AtsReport } from "@/components/ats/ats-report"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ApiError, api } from "@/lib/api"
import { scoreOf, type AtsScanReport } from "@/lib/ats-report"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Analyse ATS" }

/**
 * A scan unlocked on the landing, reopened in the app — where its magic link
 * lands the visitor (US-133). Someone else's, expired or unknown: all 404.
 */
export default async function AtsScanPage({
  params,
}: PageProps<"/analyses-ats/[scanId]">) {
  const { scanId } = await params

  let report: AtsScanReport
  try {
    report = await api<AtsScanReport>(
      `/ats/scans/${encodeURIComponent(scanId)}`
    )
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound()
    }
    throw error
  }

  return (
    <>
      <PageHeader
        title="Analyse ATS de votre CV"
        description={`Analysé le ${formatDate(report.unlockedAt)} · consultable jusqu'au ${formatDate(report.expiresAt)}.`}
        actions={
          <Button asChild>
            <Link href="/candidatures/new">
              <PlusIcon />
              Créer une candidature
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 px-4 lg:px-6">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <p className="text-5xl font-semibold tabular-nums">
              {report.overallScore}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 100
              </span>
            </p>
            <AtsScoreBadge score={scoreOf(report)} />
            <p className="basis-full text-sm text-muted-foreground">
              Un CV adapté à chaque offre reprend son vocabulaire : c’est ce que
              CVSpark génère à partir de votre profil.
            </p>
          </CardContent>
        </Card>
        <AtsReport result={report.result} />
      </div>
    </>
  )
}
