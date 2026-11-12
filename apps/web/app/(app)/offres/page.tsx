import type { Metadata } from "next"
import Link from "next/link"
import { SearchIcon, SparklesIcon } from "lucide-react"

import { OfferGrid } from "@/components/job-search/offer-grid"
import { RESULTS_GRID_COLUMNS } from "@/components/job-search/offer-grid-skeleton"
import { OfferFilters } from "@/components/job-search/offer-filters"
import {
  OfferEmptySuggestions,
  OfferResultsBody,
  OfferResultsHeader,
  OfferResultsPagination,
} from "@/components/job-search/offer-results"
import { OfferSearchBar } from "@/components/job-search/offer-search-bar"
import { OfferSearchProvider } from "@/components/job-search/offer-search-provider"
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
import { searchOffers, type OfferSearchFilters } from "@/lib/job-search"
import { DEFAULT_WINDOW_DAYS, OFFER_RESULTS_ID } from "@/lib/offer-search"

export const metadata: Metadata = { title: "Rechercher une offre" }

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

/**
 * The candidate searching our own offers, instead of waiting for the morning
 * selection. Same pool, their own criteria: words and place in the bar, the
 * rest in a column beside the results, each applied as soon as it changes.
 */
export default async function OfferSearchPage(props: PageProps<"/offres">) {
  const params = await props.searchParams
  const filters: OfferSearchFilters = {
    contrat: readParam(params.contrat),
    departement: readParam(params.departement),
    page: readParam(params.page),
    publiee: readParam(params.publiee),
    q: readParam(params.q),
    rayon: readParam(params.rayon),
    teletravail: readParam(params.teletravail),
    tri: readParam(params.tri),
    ville: readParam(params.ville),
  }
  const { available, offers, page, pageSize, place, total } =
    await searchOffers(filters)
  const visible = offers.filter((offer) => offer.status !== "dismissed")
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageHeader
        title="Rechercher une offre"
        description={`Toutes les offres collectées ces ${DEFAULT_WINDOW_DAYS} derniers jours, encore ouvertes.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/offres-du-jour">
              <SparklesIcon />
              Mes offres du jour
            </Link>
          </Button>
        }
      />
      <OfferSearchProvider filters={filters} place={place}>
        <div className="flex flex-col gap-6 px-4 lg:px-6">
          <OfferSearchBar />

          <div className="grid grid-cols-1 gap-6 @4xl/main:grid-cols-[15rem_minmax(0,1fr)]">
            <OfferFilters />

            <section
              id={OFFER_RESULTS_ID}
              aria-label="Résultats"
              // Scrolled to on a page change: stops under the sticky header.
              className="@container/results flex min-w-0 scroll-mt-[calc(var(--page-header-height,0px)+1.5rem)] flex-col gap-4"
            >
              <OfferResultsHeader available={available} total={total} />

              <OfferResultsBody>
                {visible.length === 0 ? (
                  <Empty className="border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchIcon />
                      </EmptyMedia>
                      <EmptyTitle>
                        {available === 0
                          ? "Notre base est encore vide"
                          : "Aucune offre ne correspond"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {available === 0
                          ? "Les offres sont collectées chaque matin à partir des recherches configurées. Décrivez la vôtre dans « Ma recherche » : dès la collecte suivante, elles apparaîtront ici."
                          : "Essayez moins de mots, un rayon plus large, ou retirez un filtre."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      {available === 0 ? (
                        <Button asChild>
                          <Link href="/ma-recherche">
                            Configurer ma recherche
                          </Link>
                        </Button>
                      ) : (
                        <OfferEmptySuggestions />
                      )}
                    </EmptyContent>
                  </Empty>
                ) : (
                  // Sorted by date, the cards say it to the minute (US-167).
                  <OfferGrid
                    offers={visible}
                    columns={RESULTS_GRID_COLUMNS}
                    fresh={
                      filters.tri === "recent" || filters.publiee !== undefined
                    }
                  />
                )}

                {lastPage > 1 ? (
                  <footer className="flex flex-col gap-4 pt-6 pb-4">
                    <Separator />
                    <p className="text-center text-sm text-muted-foreground">
                      Page {page} sur {lastPage}
                    </p>
                    <OfferResultsPagination page={page} lastPage={lastPage} />
                  </footer>
                ) : null}
              </OfferResultsBody>
            </section>
          </div>
        </div>
      </OfferSearchProvider>
    </>
  )
}
