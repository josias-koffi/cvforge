import type { AdminCreditOffer } from "@cvforge/types"
import type { Metadata } from "next"

import { CreateOfferButton, SyncStripeButton } from "@/components/admin/offer-dialogs"
import { OffersTable } from "@/components/admin/offers-table"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

export const metadata: Metadata = { title: "Offres de crédits" }

export default async function AdminOffersPage() {
  await requireAdminSession()
  const { offers } = await api<{ offers: AdminCreditOffer[] }>("/admin/credit-offers")

  return (
    <>
      <PageHeader
        title="Offres de crédits"
        description="Composez les packs vendus sur le site et dans l'application. Chaque enregistrement est répercuté dans Stripe."
        actions={
          <div className="flex gap-2">
            <SyncStripeButton />
            <CreateOfferButton />
          </div>
        }
      />
      <div className="px-4 lg:px-6">
        <OffersTable offers={offers} />
      </div>
    </>
  )
}
