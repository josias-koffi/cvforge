import Link from "next/link"
import {
  ArrowRightIcon,
  LightbulbIcon,
  MicIcon,
  TargetIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import { formatDelta, metricLabels, scoreVerdict } from "@/lib/interview/labels"
import type { InterviewInsights } from "@/lib/interview/insights"
import { cn } from "@/lib/utils"

function toneOf(score: number) {
  if (score >= 8) return "text-success"
  if (score >= 6) return "text-foreground"

  return "text-warning"
}

function Figure({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  hint: string
  className?: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", className)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/**
 * What the practice interviews say about *this* offer.
 *
 * Deliberately not a second report: the score is there to situate the rest,
 * and everything below it is something to do differently next time — the
 * dimensions that scored low, the advice from the last session, and the
 * requirements of this very offer that never came up when it mattered.
 */
export function ApplicationInsights({
  insights,
  offerId,
  sessionId,
}: {
  insights: InterviewInsights
  offerId: string
  /** The last session for this offer, when it could be resolved. */
  sessionId: string | null
}) {
  const plural = insights.sessionCount > 1 ? "s" : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MicIcon aria-hidden="true" className="size-4" />
          Ce que vos entretiens disent de cette offre
        </CardTitle>
        <CardDescription>
          {insights.sessionCount} session{plural} d&apos;entraînement sur cette
          candidature — la dernière le{" "}
          {formatDate(insights.latest.createdAt)}.
        </CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="outline">
            <Link href={`/entretiens/new?candidature=${offerId}`}>
              Refaire un entretien
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-3 @2xl/main:grid-cols-3">
          <Figure
            className={toneOf(insights.latestScore)}
            hint={scoreVerdict(insights.latestScore)}
            label="Dernier score"
            value={
              <>
                {insights.latestScore}
                <span className="text-sm text-muted-foreground">/10</span>
              </>
            }
          />
          <Figure
            hint={
              // Repeating the score just above it says nothing; the best run
              // is only worth naming when it is ahead of the last one.
              insights.sessionCount === 1
                ? "Une seule session pour l'instant"
                : insights.bestScore > insights.latestScore
                  ? `Votre meilleur : ${insights.bestScore}/10`
                  : "C'est votre meilleure session"
            }
            label="Évolution"
            value={formatDelta(insights.scoreDelta)}
          />
          <Figure
            hint="Des mots de l'offre repris à l'oral"
            label="Couverture de l'offre"
            value={`${insights.keywordCoverage} %`}
          />
        </div>

        {insights.focus.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <TargetIcon aria-hidden="true" className="size-4" />
              Vos points faibles sur cet entretien
            </h3>
            <ul className="flex flex-col gap-2">
              {insights.focus.map((metric) => (
                <li className="rounded-lg border p-3" key={metric.key}>
                  <p className="flex items-baseline justify-between gap-2 text-sm font-medium">
                    {metricLabels[metric.key] ?? metric.label}
                    <span className="tabular-nums text-warning">
                      {metric.score}/10
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {insights.weakRequirements.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <LightbulbIcon aria-hidden="true" className="size-4" />
              À placer la prochaine fois
            </h3>
            <p className="text-xs text-muted-foreground">
              Ces exigences de l&apos;annonce ne sont quasiment pas revenues
              dans vos réponses. Préparez un exemple concret pour chacune.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {insights.weakRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {insights.latest.improvements.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              Les conseils de votre dernière session
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {insights.latest.improvements.map((improvement) => (
                <li key={improvement}>{improvement}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {sessionId ? (
          <Button asChild className="self-start" size="sm" variant="ghost">
            <Link href={`/entretiens/${sessionId}/rapport`}>
              Voir le rapport complet
              <ArrowRightIcon />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
