import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import { formatUsd, type OpenRouterBalanceResponse } from "@/lib/metrics"

export function OpenRouterBalanceCard({
  data,
}: {
  data: OpenRouterBalanceResponse
}) {
  const { alertThreshold, balance, isLowBalance, supervisionEnabled } = data

  return (
    <Card>
      <CardHeader>
        <CardDescription>Solde OpenRouter</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-2 text-3xl tabular-nums">
          {balance ? formatUsd(balance.remaining) : "—"}
          {isLowBalance ? <Badge variant="warning">Solde bas</Badge> : null}
          {balance?.stale ? <Badge variant="outline">Valeur périmée</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {balance ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Crédits achetés</dt>
              <dd className="tabular-nums">{formatUsd(balance.totalCredits)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Consommé</dt>
              <dd className="tabular-nums">{formatUsd(balance.totalUsage)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Seuil d&apos;alerte</dt>
              <dd className="tabular-nums">{formatUsd(alertThreshold)}</dd>
            </div>
          </dl>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {supervisionEnabled
            ? balance
              ? `Relevé ${formatDateTime(balance.fetchedAt)}, mis en cache 5 minutes.`
              : "Lecture du solde impossible pour le moment. Réessayez dans quelques minutes."
            : "Supervision inactive : renseignez OPENROUTER_MANAGEMENT_API_KEY (une clé de management, pas la clé d'inférence) pour suivre le solde et recevoir les alertes."}
        </p>
      </CardContent>
    </Card>
  )
}
