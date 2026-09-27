import type { Metadata } from "next"
import Link from "next/link"
import { SearchIcon, SparklesIcon } from "lucide-react"

import { OfferGrid } from "@/components/job-search/offer-grid"
import { PagePagination } from "@/components/data-table/page-pagination"
import { OfferSearchForm } from "@/components/job-search/offer-search-form"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { searchOffers } from "@/lib/job-search"

export const metadata: Metadata = { title: "Rechercher une offre" }

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

/**
 * The candidate searching our own offers, instead of waiting for the morning
 * selection. Same pool, their own criteria.
 */
export default async function OfferSearchPage(props: PageProps<"/offres">) {
  const params = await props.searchParams
  const filters = {
    contrat: readParam(params.contrat),
    departement: readParam(params.departement),
    page: readParam(params.page),
    q: readParam(params.q),
    teletravail: readParam(params.teletravail),
  }
  const { available, offers, page, pageSize, total } = await searchOffers(filters)
  const visible = offers.filter((offer) => offer.status !== "dismissed")
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageHeader
        title="Rechercher une offre"
        description="Toutes les offres collectées ces 30 derniers jours, à vous de fouiller."
        actions={
          <Button asChild variant="outline">
            <Link href="/offres-du-jour">
              <SparklesIcon />
              Mes offres du jour
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <OfferSearchForm filters={filters} />

        <p className="text-muted-foreground text-sm">
          {total === 0
            ? "Aucune offre ne correspond."
            : `${total} offre(s) sur ${available} en base — page ${page} sur ${lastPage}.`}
        </p>

        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>
                {available === 0 ? "Notre base est encore vide" : "Rien trouvé"}
              </EmptyTitle>
              <EmptyDescription>
                {available === 0
                  ? "Les offres sont collectées chaque matin à partir des recherches configurées. Décrivez la vôtre dans « Ma recherche » : dès la collecte suivante, elles apparaîtront ici."
                  : "Essayez moins de mots, ou élargissez le département. Notre base ne contient que les offres collectées ces 30 derniers jours."}
              </EmptyDescription>
            </EmptyHeader>
            {available === 0 ? (
              <EmptyContent>
                <Button asChild>
                  <Link href="/ma-recherche">Configurer ma recherche</Link>
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <OfferGrid offers={visible} />
        )}

        {lastPage > 1 ? (
          <footer className="flex flex-col gap-4 pb-4">
            <Separator />
            <PagePagination
              page={page}
              lastPage={lastPage}
              path="/offres"
              // The criteria are carried over, the open offer is not: it is
              // not on the page being asked for.
              params={filters}
            />
          </footer>
        ) : null}
      </div>
    </>
  )
}
