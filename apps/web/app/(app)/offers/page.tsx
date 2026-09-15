import type { Metadata } from "next"
import Link from "next/link"
import type { DraftApplication } from "@cvforge/types"
import { PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { OffersTable } from "@/components/offers/offers-table"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Offres" }

export default async function OffersPage() {
  const { applications } = await api<{ applications: DraftApplication[] }>(
    "/applications"
  )

  return (
    <>
      <PageHeader
        title="Offres"
        description="Toutes les offres importées, avec leur statut et leurs documents."
        actions={
          <Button asChild>
            <Link href="/offers/new">
              <PlusIcon />
              Nouvelle offre
            </Link>
          </Button>
        }
      />
      <div className="px-4 lg:px-6">
        <OffersTable offers={applications} />
      </div>
    </>
  )
}
