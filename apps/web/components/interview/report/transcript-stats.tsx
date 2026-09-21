import type { InterviewTranscriptStats } from "@cvforge/types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * The measured facts behind the scores — counted locally from the transcript,
 * not asked of a model, so they are the same numbers every time.
 */
export function TranscriptStats({
  stats,
  hasLinkedOffer,
}: {
  stats: InterviewTranscriptStats
  hasLinkedOffer: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ce qui a été mesuré</CardTitle>
        <CardDescription>
          Relevé sur la transcription, indépendamment de l&apos;analyse.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-4 @2xl/main:grid-cols-4">
          <Stat label="Réponses" value={String(stats.responseCount)} />
          <Stat
            label="Durée moyenne"
            value={
              stats.averageResponseDurationSeconds === null
                ? "—"
                : `${stats.averageResponseDurationSeconds} s`
            }
          />
          <Stat label="Hésitations" value={String(stats.hesitationCount)} />
          <Stat
            // Without an offer there is nothing to measure coverage against,
            // and a flat 0 would read as a bad score rather than no score.
            label={hasLinkedOffer ? "Mots-clés de l'offre" : "Mots-clés"}
            value={hasLinkedOffer ? `${stats.keywordCoverage} %` : "—"}
          />
        </dl>

        {hasLinkedOffer && stats.keywordMentions.length > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Repris de l&apos;offre : {stats.keywordMentions.join(", ")}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
