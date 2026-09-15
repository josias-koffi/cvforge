import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { ImportOfferForm } from "@/components/offers/import-offer-form"

export const metadata: Metadata = { title: "Nouvelle offre" }

export default function NewOfferPage() {
  return (
    <>
      <PageHeader
        title="Nouvelle offre"
        description="Collez un lien ou le texte d'une annonce : on en extrait l'essentiel pour préparer votre CV et votre lettre."
      />
      <div className="max-w-3xl px-4 lg:px-6">
        <ImportOfferForm />
      </div>
    </>
  )
}
