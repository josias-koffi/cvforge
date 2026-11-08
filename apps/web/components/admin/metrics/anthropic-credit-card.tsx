import type { AnthropicCreditSummary } from "@cvforge/types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatUsd } from "@/lib/admin-metrics/format"
import { formatDate } from "@/lib/format"

/** A countdown from our own records: a standard API key cannot read the balance. */
export function AnthropicCreditCard({ credit }: { credit: AnthropicCreditSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Crédit Claude restant (estimation)</CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {formatUsd(credit.remainingUsd)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          {formatUsd(credit.spentUsd)} consommés sur les{" "}
          {formatUsd(credit.recordedUsd)} relevés le {formatDate(credit.recordedAt)}.
        </p>
        <p className="text-xs text-muted-foreground">
          Calculé d&apos;après les appels enregistrés et les tarifs publiés. Après une
          recharge, saisissez le nouveau solde dans Modèles IA.
        </p>
      </CardContent>
    </Card>
  )
}
