"use client"

import type { ScoreBreakdown } from "@cvforge/types"
import { InfoIcon, SparklesIcon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { criterionPoints, matchLevel, SCORE_CRITERIA } from "@/lib/match-score"

const SCORE_EXPLANATION =
  "Calculé chaque matin d'après votre recherche et votre CV : intitulé du poste, compétences, lieu, fraîcheur de l'offre, expérience et salaire."

/**
 * The match score on a card: a verdict in words, then the number, then a
 * gauge. The tooltip says what is measured; the panel says how.
 */
export function MatchScoreSummary({ score }: { score: number }) {
  const level = matchLevel(score)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={`font-medium ${level.text}`}>{level.label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Above the card's overlay button, or it could not be hovered. */}
            <button
              type="button"
              className="relative z-10 inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground tabular-nums hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {score} %
              <InfoIcon className="size-3.5" aria-hidden />
              <span className="sr-only">Comment ce score est-il calculé ?</span>
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            {SCORE_EXPLANATION}
          </TooltipContent>
        </Tooltip>
      </div>
      <Gauge
        percent={score}
        bar={level.bar}
        label={`${score} % de correspondance`}
      />
    </div>
  )
}

/**
 * "Pourquoi cette offre ?": the verdict, the AI's reason, and the points
 * earned on each criterion out of what it is worth — so "65" becomes "strong
 * on the title and the place, weak on the skills".
 */
export function MatchScoreDetail({
  score,
  breakdown,
  aiReason,
}: {
  score: number
  breakdown: ScoreBreakdown | null | undefined
  aiReason: string | null
}) {
  const level = matchLevel(score)

  return (
    <section
      aria-labelledby="match-score-title"
      className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 id="match-score-title" className="text-sm font-medium">
            Pourquoi cette offre ?
          </h3>
          <p className="text-xs text-muted-foreground">{SCORE_EXPLANATION}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-semibold tabular-nums ${level.text}`}>
            {score} %
          </p>
          <p className={`text-xs ${level.text}`}>{level.label}</p>
        </div>
      </div>

      <Gauge
        percent={score}
        bar={level.bar}
        label={`${score} % de correspondance`}
      />

      {aiReason ? <AiReason reason={aiReason} /> : null}

      {breakdown ? (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {SCORE_CRITERIA.map((criterion) => {
            const { percent, points } = criterionPoints(breakdown, criterion)

            return (
              <div key={criterion.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <dt title={criterion.hint}>{criterion.label}</dt>
                  <dd className="text-muted-foreground tabular-nums">
                    {points} / {criterion.weight}
                  </dd>
                </div>
                <Gauge
                  percent={percent}
                  bar="bg-primary/70"
                  label={`${criterion.label} : ${points} points sur ${criterion.weight}`}
                  thin
                />
              </div>
            )
          })}
        </dl>
      ) : null}
    </section>
  )
}

/** The reranker's one-line reason, on its own when there is no score. */
export function AiReason({ reason }: { reason: string }) {
  return (
    <p className="flex gap-2 text-sm">
      <SparklesIcon
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden
      />
      {reason}
    </p>
  )
}

function Gauge({
  percent,
  bar,
  label,
  thin = false,
}: {
  percent: number
  bar: string
  label: string
  thin?: boolean
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={`w-full overflow-hidden rounded-full bg-muted ${thin ? "h-1" : "h-1.5"}`}
    >
      <div
        className={`h-full rounded-full ${bar}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
