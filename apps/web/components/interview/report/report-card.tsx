import type { InterviewReport } from "@cvforge/types"
import { LightbulbIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { scoreVerdict } from "@/lib/interview/labels"
import { cn } from "@/lib/utils"

function toneOf(score: number) {
  if (score >= 8) return "text-success"
  if (score >= 6) return "text-foreground"

  return "text-warning"
}

/**
 * The verdict: one score, what it means in words, and what to work on next.
 * The wording carries the meaning — the colour only reinforces it.
 */
export function ReportCard({ report }: { report: InterviewReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultat</CardTitle>
        <CardDescription>{report.summary}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <p className="flex items-baseline gap-3">
          <span
            className={cn(
              "text-4xl font-semibold tabular-nums",
              toneOf(report.overallScore)
            )}
          >
            {report.overallScore}
            <span className="text-xl text-muted-foreground">/10</span>
          </span>
          <span className="text-sm text-muted-foreground">
            {scoreVerdict(report.overallScore)}
          </span>
        </p>

        {report.improvements.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <LightbulbIcon aria-hidden="true" className="size-4" />
              À travailler en priorité
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {report.improvements.map((improvement) => (
                <li key={improvement}>{improvement}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
