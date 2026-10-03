import {
  JOB_ALERT_VERDICT_LABELS,
  type JobAlertAnalysis,
  type JobAlertVerdict,
} from "@cvforge/types"
import { SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

const VERDICT_VARIANTS: Record<
  JobAlertVerdict,
  "default" | "secondary" | "outline"
> = {
  consider: "secondary",
  seize: "default",
  skip: "outline",
}

/** The analysis' verdict, on the card: "À saisir", "À considérer", "À passer". */
export function AlertVerdictBadge({
  analysis,
}: {
  analysis: JobAlertAnalysis
}) {
  return (
    <Badge variant={VERDICT_VARIANTS[analysis.verdict]}>
      <SparklesIcon aria-hidden />
      {JOB_ALERT_VERDICT_LABELS[analysis.verdict]}
    </Badge>
  )
}

/**
 * The paid analysis of an alert (US-168), in its own box beside the offer.
 * The advert below it stays whole and untouched: the analysis comments on
 * it, never stands in for it.
 */
export function AlertAnalysis({ analysis }: { analysis: JobAlertAnalysis }) {
  const sections: Array<[string, string[]]> = [
    ["Pourquoi elle vaut le coup", analysis.reasons],
    ["Points de vigilance", analysis.watchouts],
    ["À mettre en avant dans le CV et la lettre", analysis.highlights],
  ]

  return (
    <section
      aria-labelledby="alert-analysis-title"
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id="alert-analysis-title"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <SparklesIcon className="size-4 text-primary" aria-hidden />
          Analyse IA
        </h3>
        <AlertVerdictBadge analysis={analysis} />
      </div>
      {sections
        .filter(([, points]) => points.length > 0)
        .map(([title, points]) => (
          <div key={title} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      <p className="text-xs text-muted-foreground">
        Repris pour votre CV et votre lettre si vous postulez, sans crédit
        supplémentaire.
      </p>
    </section>
  )
}
