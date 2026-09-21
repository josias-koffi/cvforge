import type { InterviewProgressSummary } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import {
  GaugeIcon,
  MicIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react"

import { ProgressChart } from "@/components/interview/progress/progress-chart"
import { StrengthsCard } from "@/components/interview/progress/strengths-card"
import { StatStrip } from "@/components/interview/stat-strip"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/lib/api"
import { formatDelta, metricLabels } from "@/lib/interview/labels"
import { hasProgressData } from "@/lib/interview/progress"

export const metadata: Metadata = { title: "Progression" }

function summaryStats(progress: InterviewProgressSummary) {
  const [strength] = progress.strengths
  const sessions = progress.sessionCount

  return [
    {
      hint: "Moyenne sur la période",
      icon: GaugeIcon,
      label: "Score global",
      tone: "bg-primary/10 text-primary",
      value:
        progress.overallScoreAverage === null ? (
          "—"
        ) : (
          <>
            {progress.overallScoreAverage}
            <span className="text-base text-muted-foreground">/10</span>
          </>
        ),
    },
    {
      hint: "Depuis votre première session",
      icon: TrendingUpIcon,
      label: "Évolution",
      tone: "bg-success/12 text-success",
      value: formatDelta(progress.overallScoreDelta),
    },
    {
      hint: "Les 10 dernières sont retenues",
      icon: MicIcon,
      label: "Sessions analysées",
      tone: "bg-info/12 text-info",
      value: sessions,
    },
    {
      hint: strength
        ? `${strength.average}/10 en moyenne`
        : "Visible dès que les scores se confirment",
      icon: SparklesIcon,
      label: "Point fort",
      tone: "bg-spark/20 text-spark-foreground dark:text-spark",
      value: strength
        ? (metricLabels[strength.key] ?? strength.label)
        : "—",
    },
  ]
}

export default async function InterviewProgressPage() {
  const { progress } = await api<{ progress: InterviewProgressSummary }>(
    "/interviews/progress"
  )

  return (
    <>
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/entretiens/new">
              <MicIcon />
              Nouvel entretien
            </Link>
          </Button>
        }
        description="Comment vos entretiens évoluent, et sur quoi concentrer vos efforts."
        title="Ma progression"
      />

      {!hasProgressData(progress) ? (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Pas encore de progression à montrer</CardTitle>
              <CardDescription>
                Terminez un premier entretien : le rapport alimente cette page,
                et la tendance apparaît dès la deuxième session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/entretiens/new">Commencer maintenant</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <StatStrip className="px-4 lg:px-6" items={summaryStats(progress)} />

          <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_380px]">
            <ProgressChart progress={progress} />
            <StrengthsCard
              strengths={progress.strengths}
              weaknesses={progress.weaknesses}
            />
          </div>
        </>
      )}
    </>
  )
}
