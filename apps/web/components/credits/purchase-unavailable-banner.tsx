import { AlertTriangleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { PurchaseAvailability } from "@/lib/billing"

const messages: Record<
  NonNullable<PurchaseAvailability["reason"]>,
  { description: string; title: string }
> = {
  ai_credits_exhausted: {
    description:
      "Notre fournisseur d'IA est temporairement à court de crédits. Nous rechargeons le compte : l'achat sera rouvert dans quelques heures. Vos crédits déjà achetés restent utilisables.",
    title: "Achat de crédits momentanément suspendu",
  },
  stripe_unavailable: {
    description:
      "Le service de paiement est indisponible pour le moment. Réessayez plus tard.",
    title: "Paiement indisponible",
  },
}

export function PurchaseUnavailableBanner({
  availability,
}: {
  availability: PurchaseAvailability
}) {
  if (availability.available || !availability.reason) {
    return null
  }

  const { description, title } = messages[availability.reason]

  return (
    <div className="px-4 lg:px-6">
      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  )
}
