import { estimateApplications, type CreditBalanceSummary } from "@cvforge/types"
import { CoinsIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatApplications, formatCredits } from "@/lib/format"

/** The balance, in credits and in what it still pays for. */
export function CreditBalance({ credits }: { credits: CreditBalanceSummary }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2 shadow-surface">
      <span className="flex size-9 items-center justify-center rounded-lg bg-spark/20 text-spark-foreground dark:text-spark">
        <CoinsIcon className="size-5" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-lg leading-tight font-semibold tabular-nums">
          {formatCredits(credits.balance)}
        </p>
        <p className="text-xs text-muted-foreground">
          ≈ {formatApplications(estimateApplications(credits.balance))}
        </p>
      </div>
      {credits.isLowBalance ? (
        <Badge variant="warning">Solde faible</Badge>
      ) : null}
    </div>
  )
}
