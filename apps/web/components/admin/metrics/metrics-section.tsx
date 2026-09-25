import { cn } from "cn"

/**
 * The cockpit's grid of cards under the KPI row. Two columns once the main
 * area is wide enough; one on a phone, where every card is full width.
 */
export function MetricsGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // min-w-0: a wide table scrolls inside its card instead of widening the page.
        "grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2 [&>*]:min-w-0",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Small "label: value" lines, for the figures that do not deserve a card. */
export function StatList({
  items,
}: {
  items: ReadonlyArray<{ label: string; value: string }>
}) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
