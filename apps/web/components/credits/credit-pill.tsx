/**
 * What an AI action costs, shown on the amber button that triggers it. The
 * number sits in a darker chip so it reads at a glance; screen readers get the
 * unit. Nothing is drawn for a free action: amber means "this spends credits".
 */
export function CreditPill({ amount }: { amount?: number }) {
  if (!amount) return null

  return (
    <span
      data-slot="credit-pill"
      className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-md bg-spark-foreground/15 px-1.5 text-xs font-semibold tabular-nums"
    >
      {amount.toLocaleString("fr-FR")}
      <span className="sr-only"> crédit{amount >= 2 ? "s" : ""}</span>
    </span>
  )
}
