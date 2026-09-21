import type { InterviewTranscriptStats } from "@cvforge/types"
import {
  MessagesSquareIcon,
  PauseIcon,
  TagIcon,
  TimerIcon,
} from "lucide-react"

import { StatStrip } from "@/components/interview/stat-strip"

/**
 * The measured facts behind the scores — counted locally from the transcript,
 * not asked of a model, so they are the same numbers every time.
 *
 * Shown as the dashboard's KPI row rather than as a card of its own: four
 * numbers never justified the height, and this is the shape the rest of the
 * product already uses to state a figure.
 */
export function ReportStats({
  stats,
  hasLinkedOffer,
}: {
  stats: InterviewTranscriptStats
  hasLinkedOffer: boolean
}) {
  return (
    <StatStrip
      className="px-4 lg:px-6"
      items={[
        {
          hint: "Prises de parole comptées",
          icon: MessagesSquareIcon,
          label: "Réponses",
          tone: "bg-primary/10 text-primary",
          value: stats.responseCount,
        },
        {
          hint: "Par réponse",
          icon: TimerIcon,
          label: "Durée moyenne",
          tone: "bg-info/12 text-info",
          value:
            stats.averageResponseDurationSeconds === null
              ? "—"
              : `${stats.averageResponseDurationSeconds} s`,
        },
        {
          hint: "« euh », reprises et blancs",
          icon: PauseIcon,
          label: "Hésitations",
          tone: "bg-warning/12 text-warning",
          value: stats.hesitationCount,
        },
        {
          icon: TagIcon,
          // Without an offer there is nothing to measure coverage against,
          // and a flat 0 would read as a bad score rather than no score.
          label: hasLinkedOffer ? "Mots-clés de l'offre" : "Mots-clés",
          tone: "bg-success/12 text-success",
          value: hasLinkedOffer ? `${stats.keywordCoverage} %` : "—",
          hint: !hasLinkedOffer
            ? "Aucune offre liée à cet entretien"
            : stats.keywordMentions.length > 0
              ? `Repris : ${stats.keywordMentions.join(", ")}`
              : "Aucun mot-clé de l'offre repris",
        },
      ]}
    />
  )
}
