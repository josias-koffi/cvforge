import type { Insight, InsightTone, MetricsPeriod } from "@cvforge/types"
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { withPeriod } from "@/lib/admin-metrics/period"

const TONES: Record<
  InsightTone,
  { icon: LucideIcon; className: string; label: string }
> = {
  good: {
    icon: CircleCheckIcon,
    className: "bg-success/12 text-success",
    label: "Bonne nouvelle",
  },
  warn: {
    icon: TriangleAlertIcon,
    className: "bg-warning/12 text-warning",
    label: "À surveiller",
  },
  bad: {
    icon: CircleAlertIcon,
    className: "bg-destructive/10 text-destructive",
    label: "Problème",
  },
  info: {
    icon: InfoIcon,
    className: "bg-info/12 text-info",
    label: "Information",
  },
}

/**
 * What the figures say, in sentences: the API reads the numbers so the owner
 * does not have to scan six tabs to notice a margin going negative. Each
 * finding links to the tab that explains it.
 */
export function InsightsPanel({
  insights,
  period,
}: {
  insights: readonly Insight[]
  /** Kept on the links, so the tab opens on the same figures. */
  period: MetricsPeriod
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>À retenir</CardTitle>
        <CardDescription>
          Ce que les chiffres de la période font ressortir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Rien de notable sur la période : pas assez de données, ou tout va
            bien.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {insights.map((insight) => (
              <InsightRow
                key={insight.id}
                href={withPeriod(insight.href, period)}
                insight={insight}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function InsightRow({ href, insight }: { href: string; insight: Insight }) {
  const tone = TONES[insight.tone]

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${tone.className}`}
      >
        <tone.icon aria-hidden className="size-4" />
        <span className="sr-only">{tone.label} :</span>
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium">{insight.title}</p>
        <p className="text-sm text-muted-foreground">{insight.detail}</p>
      </div>
      <Link
        className="inline-flex shrink-0 items-center gap-1 self-center text-sm font-medium text-primary hover:underline"
        href={href}
      >
        Voir
        <ArrowRightIcon aria-hidden className="size-4" />
        <span className="sr-only"> le détail : {insight.title}</span>
      </Link>
    </li>
  )
}
