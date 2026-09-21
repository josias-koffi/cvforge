import type { InterviewProgressSummary } from "@cvforge/types"
import type { Metadata } from "next"
import Link from "next/link"
import { MicIcon } from "lucide-react"

import { ProgressChart } from "@/components/interview/progress/progress-chart"
import { StrengthsCard } from "@/components/interview/progress/strengths-card"
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
import { formatDelta } from "@/lib/interview/labels"
import { hasProgressData } from "@/lib/interview/progress"

export const metadata: Metadata = { title: "Progression" }

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

      <div className="px-4 lg:px-6">
        {!hasProgressData(progress) ? (
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
        ) : (
          <div className="grid gap-4 @5xl/main:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Score global</CardTitle>
                  <CardDescription>
                    Moyenne sur la période, et écart depuis la première session.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="flex items-baseline gap-3">
                    <span className="text-4xl font-semibold tabular-nums">
                      {progress.overallScoreAverage}
                      <span className="text-xl text-muted-foreground">/10</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDelta(progress.overallScoreDelta)}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <ProgressChart progress={progress} />
            </div>

            <StrengthsCard
              strengths={progress.strengths}
              weaknesses={progress.weaknesses}
            />
          </div>
        )}
      </div>
    </>
  )
}
