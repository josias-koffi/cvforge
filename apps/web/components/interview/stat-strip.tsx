import type { LucideIcon } from "lucide-react"

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StatItem = {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: LucideIcon
  /** Background and text classes for the icon chip, as on the dashboard. */
  tone: string
}

/**
 * A row of small facts, in the dashboard's own vocabulary.
 *
 * The report and the progress page used to open on a tall card holding four
 * numbers; the dashboard said the same kind of thing in a quarter of the
 * height. This is that pattern, compact, so all three pages read as one
 * product.
 */
export function StatStrip({
  items,
  className,
}: {
  items: StatItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @4xl/main:grid-cols-4",
        className
      )}
    >
      {items.map((item, index) => (
        <Card
          className="@container/card gap-2 rise-in py-4"
          key={item.label}
          style={{ "--stagger": index } as React.CSSProperties}
        >
          <CardHeader className="gap-1 px-4">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {item.value}
            </CardTitle>
            <CardAction>
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  item.tone
                )}
              >
                <item.icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </span>
            </CardAction>
            {item.hint ? (
              // Clamped: a hint that lists every keyword of an offer would
              // otherwise stretch the whole row to its height.
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.hint}
              </p>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
