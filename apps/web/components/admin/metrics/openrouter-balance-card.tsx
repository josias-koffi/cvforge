import type { OpenRouterBalanceSummary } from "@cvforge/types"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCount, formatUsd } from "@/lib/admin-metrics/format"

/** Under this many days of runway the card asks for a top-up, as the insights do. */
export const LOW_RUNWAY_DAYS = 14
/** Beyond a year, a day count is extrapolation noise: say "more than a year". */
const RUNWAY_HORIZON_DAYS = 365

function runwayText(runwayDays: number | null) {
  if (runwayDays === null) {
    return "Autonomie inconnue : pas de dépense sur la période, ou solde illisible."
  }
  if (runwayDays > RUNWAY_HORIZON_DAYS) {
    return "Plus d'un an d'autonomie au rythme de la période."
  }

  return `Environ ${formatCount(Math.floor(runwayDays))} jours d'autonomie au rythme de la période.`
}

/**
 * What is left on OpenRouter and how long it lasts at the period's pace. The
 * runway is the figure that matters: a balance in dollars says nothing about
 * whether the product stops answering next week.
 */
export function OpenRouterBalanceCard({
  balance,
}: {
  balance: OpenRouterBalanceSummary
}) {
  const { enabled, remainingUsd, runwayDays, stale } = balance
  const low = runwayDays !== null && runwayDays < LOW_RUNWAY_DAYS

  return (
    <Card>
      <CardHeader>
        <CardDescription>Solde OpenRouter</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-2 text-3xl tabular-nums">
          {formatUsd(remainingUsd)}
          {low ? <Badge variant="warning">À recharger</Badge> : null}
          {stale ? <Badge variant="outline">Valeur périmée</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {enabled ? (
          <p>{runwayText(runwayDays)}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {enabled
            ? stale
              ? "Dernière lecture du solde en échec : la valeur affichée peut être dépassée."
              : "Relevé mis en cache 5 minutes."
            : "Supervision inactive : renseignez OPENROUTER_MANAGEMENT_API_KEY (une clé de management, pas la clé d'inférence) pour suivre le solde et recevoir les alertes."}
        </p>
      </CardContent>
    </Card>
  )
}
