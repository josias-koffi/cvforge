import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * One metric: a label, a headline figure and an optional breakdown.
 *
 * `hint` carries the caveat when a figure is an estimate — a dashboard that
 * shows an approximation as a hard number is worse than one that says so.
 */
export function MetricCard({
  breakdown,
  hint,
  label,
  value,
}: {
  breakdown?: Array<{ label: string; value: string }>
  hint?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {breakdown?.length || hint ? (
        <CardContent className="space-y-2">
          {breakdown?.length ? (
            <dl className="space-y-1 text-sm">
              {breakdown.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  )
}
