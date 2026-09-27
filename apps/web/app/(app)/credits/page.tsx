import type { Metadata } from "next"
import type { PublicCreditOffer } from "@cvforge/types"

import { CreditCosts } from "@/components/credits/credit-costs"
import { CreditOfferCard } from "@/components/credits/credit-offer-card"
import { PurchaseUnavailableBanner } from "@/components/credits/purchase-unavailable-banner"
import { api } from "@/lib/api"
import type { PurchaseAvailability } from "@/lib/billing"

export const metadata: Metadata = { title: "Crédits" }

/** Buying credits: the packs, and what the credits pay for. */
export default async function CreditsPage() {
  const [{ offers }, availability] = await Promise.all([
    api<{ offers: PublicCreditOffer[] }>("/public/credit-offers"),
    api<PurchaseAvailability>("/billing/purchase-availability"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PurchaseUnavailableBanner availability={availability} />
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
        {offers.map((offer) => (
          <CreditOfferCard
            key={offer.id}
            offer={offer}
            purchasable={availability.available}
          />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <CreditCosts />
      </div>
    </div>
  )
}
