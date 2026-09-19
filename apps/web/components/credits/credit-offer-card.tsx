import { estimateApplications, type PublicCreditOffer } from "@cvforge/types"
import { CheckIcon } from "lucide-react"
import { cn } from "cn"

import { startCheckout } from "@/app/(app)/credits/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatApplications, formatPrice } from "@/lib/format"

export function CreditOfferCard({
  offer,
  purchasable = true,
}: {
  offer: PublicCreditOffer
  purchasable?: boolean
}) {
  return (
    <Card className={cn(offer.isFeatured && "ring-2 ring-spark")}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {offer.name.fr}
          {offer.isFeatured ? <Badge variant="spark">Le plus choisi</Badge> : null}
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {formatApplications(estimateApplications(offer.credits))}
        </CardTitle>
        <p className="text-sm tabular-nums text-muted-foreground">
          {offer.credits} crédits · analyse, CV et lettre
        </p>
        {offer.description.fr ? (
          <p className="text-sm text-muted-foreground">{offer.description.fr}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {offer.features.fr.map((feature) => (
            <li key={feature} className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto">
        <ActionButton
          className="w-full"
          variant={offer.isFeatured ? "spark" : undefined}
          disabled={!purchasable}
          pendingLabel="Redirection vers Stripe…"
          action={startCheckout.bind(null, offer.id)}
        >
          {purchasable
            ? `Acheter · ${formatPrice(offer.priceCents)}`
            : "Achat indisponible"}
        </ActionButton>
      </CardFooter>
    </Card>
  )
}
