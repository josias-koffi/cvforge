import type { Kpi } from "@cvforge/types"
import type { LucideIcon } from "lucide-react"

import { DeltaBadge } from "@/components/admin/metrics/delta-badge"
import { deltaPercent } from "@/lib/admin-metrics/format"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Icon tints, the same as the dashboard's cards. */
export const KPI_TONES = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  spark: "bg-spark/20 text-spark-foreground dark:text-spark",
  destructive: "bg-destructive/10 text-destructive",
} as const

/** One headline figure of a tab. */
export type KpiItem = {
  label: string
  /** Already formatted: the row does not know euros from calls. */
  value: string
  icon: LucideIcon
  tone: keyof typeof KPI_TONES
  /** The raw figure and its previous value, for the change badge. */
  kpi?: Kpi
  upIsBad?: boolean
  hint?: string
}

/** A footer with nothing to show would draw an empty band under the figure. */
function hasDelta(item: KpiItem) {
  return item.kpi !== undefined && deltaPercent(item.kpi) !== null
}

/**
 * A tab's headline figures, drawn like the dashboard's cards so the cockpit
 * reads as the same product. Each card says how the figure moved against the
 * period before.
 */
export function KpiRow({ items }: { items: readonly KpiItem[] }) {
  // Four cards on a row of three would leave one alone on the next line.
  const wide =
    items.length % 4 === 0 ? "@5xl/main:grid-cols-4" : "@5xl/main:grid-cols-3"

  return (
    <div
      className={`grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 ${wide}`}
    >
      {items.map((item, index) => (
        <Card
          key={item.label}
          className="@container/card rise-in"
          style={{ "--stagger": index } as React.CSSProperties}
        >
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {item.value}
            </CardTitle>
            <CardAction>
              <span
                className={`flex size-9 items-center justify-center rounded-lg ${KPI_TONES[item.tone]}`}
              >
                <item.icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
            </CardAction>
          </CardHeader>
          {hasDelta(item) || item.hint ? (
            <CardFooter className="flex-wrap items-center gap-2 text-sm">
              {item.kpi ? (
                <DeltaBadge kpi={item.kpi} upIsBad={item.upIsBad} />
              ) : null}
              {item.hint ? (
                <span className="text-muted-foreground">{item.hint}</span>
              ) : null}
            </CardFooter>
          ) : null}
        </Card>
      ))}
    </div>
  )
}
