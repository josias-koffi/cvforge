import { AI_CREDIT_COSTS, CREDITS_PER_INTERVIEW_MINUTE } from "@cvforge/types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCredits } from "@/lib/format"

const COSTS = [
  {
    cost: formatCredits(AI_CREDIT_COSTS.offer_enrichment),
    label: "Analyse d'offre",
  },
  { cost: formatCredits(AI_CREDIT_COSTS.cv_generation), label: "CV généré" },
  {
    cost: formatCredits(AI_CREDIT_COSTS.letter_generation),
    label: "Lettre générée",
  },
  {
    cost: `${formatCredits(CREDITS_PER_INTERVIEW_MINUTE)} / min`,
    label: "Entretien simulé et rapport",
  },
  { cost: formatCredits(AI_CREDIT_COSTS.cv_import), label: "Import de CV" },
]

/** The price list, so a pack can be read as what it pays for. */
export function CreditCosts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Combien coûte chaque action ?</CardTitle>
        <CardDescription>
          Les crédits ne sont débités que lorsque l&apos;IA travaille pour vous,
          et n&apos;expirent pas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 @5xl/main:grid-cols-3">
          {COSTS.map(({ cost, label }) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b border-dashed pb-2"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{cost}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
