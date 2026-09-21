import type { InterviewMetricTrend } from "@cvforge/types"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDelta, metricLabels } from "@/lib/interview/labels"
import { cn } from "@/lib/utils"

function TrendRow({ trend }: { trend: InterviewMetricTrend }) {
  const improving = trend.delta > 0

  return (
    <li className="flex items-baseline justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm font-medium">
        {metricLabels[trend.key] ?? trend.label}
      </span>
      <span className="flex items-baseline gap-2 text-sm tabular-nums">
        <span>{trend.average}/10</span>
        <span
          className={cn(
            "text-xs",
            trend.delta === 0
              ? "text-muted-foreground"
              : improving
                ? "text-success"
                : "text-warning"
          )}
        >
          {/* The sign carries the direction; the arrow and colour only echo it. */}
          {trend.delta !== 0 ? (
            improving ? (
              <TrendingUpIcon aria-hidden="true" className="inline size-3" />
            ) : (
              <TrendingDownIcon aria-hidden="true" className="inline size-3" />
            )
          ) : null}{" "}
          {formatDelta(trend.delta)}
        </span>
      </span>
    </li>
  )
}

/**
 * What the candidate can lean on, and what keeps costing them — averaged over
 * the window rather than read off the last session, so one bad morning does
 * not become a weakness.
 */
export function StrengthsCard({
  strengths,
  weaknesses,
}: {
  strengths: InterviewMetricTrend[]
  weaknesses: InterviewMetricTrend[]
}) {
  const nothingYet = strengths.length === 0 && weaknesses.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forces et faiblesses</CardTitle>
        <CardDescription>
          Ce qui revient d&apos;une session à l&apos;autre, avec l&apos;écart
          depuis la première.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {nothingYet ? (
          <p className="text-sm text-muted-foreground">
            Rien de marquant pour l&apos;instant : vos scores sont homogènes.
            Enchaînez quelques sessions pour voir une tendance se dégager.
          </p>
        ) : null}

        {strengths.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Points forts</h3>
            <ul className="flex flex-col gap-2">
              {strengths.map((trend) => (
                <TrendRow key={trend.key} trend={trend} />
              ))}
            </ul>
          </div>
        ) : null}

        {weaknesses.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">À travailler</h3>
            <ul className="flex flex-col gap-2">
              {weaknesses.map((trend) => (
                <TrendRow key={trend.key} trend={trend} />
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
