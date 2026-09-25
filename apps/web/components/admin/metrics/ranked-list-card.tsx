import type { RankedItem } from "@cvforge/types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCount } from "@/lib/admin-metrics/format"

const PERCENT = 100

/**
 * The top entries of something — companies, jobs, templates — with a bar
 * proportional to the first one. The count is in the text next to the bar,
 * which is decorative: a screen reader reads "Airbus, 12".
 */
export function RankedListCard({
  description,
  emptyLabel = "Rien sur la période.",
  items,
  title,
}: {
  description: string
  emptyLabel?: string
  items: readonly RankedItem[]
  title: string
}) {
  const max = items.reduce((top, item) => Math.max(top, item.count), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {item.label}
                    {item.detail ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCount(item.count)}
                  </span>
                </div>
                <div
                  aria-hidden
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    data-slot="ranked-bar"
                    style={{
                      width: `${max > 0 ? (item.count / max) * PERCENT : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
