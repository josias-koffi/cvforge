import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { EditOfferForm } from "@/components/offers/edit-offer-form"
import { loadOffer } from "@/lib/offers"

export const metadata: Metadata = { title: "Modifier l'offre" }

export default async function EditOfferPage(props: PageProps<"/offers/[id]/edit">) {
  const { id } = await props.params
  const { application, offerText } = await loadOffer(id)

  return (
    <>
      <PageHeader
        title="Modifier l'offre"
        description={application.extracted.title}
      />
      <div className="px-4 lg:px-6">
        {/* key forces fresh defaults after an AI re-extraction refresh */}
        <EditOfferForm key={application.updatedAt} offer={application} offerText={offerText} />
      </div>
    </>
  )
}
