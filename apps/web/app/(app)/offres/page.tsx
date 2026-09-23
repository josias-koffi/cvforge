import type { Metadata } from "next"
import Link from "next/link"
import { SearchIcon, SparklesIcon } from "lucide-react"

import { JobMatchCard } from "@/components/job-search/job-match-card"
import { OfferSearchForm } from "@/components/job-search/offer-search-form"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
  const { offers, page, pageSize, total } = await searchOffers(filters)
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
            : `${total} offre(s) — page ${page} sur ${lastPage}.`}
        </p>

        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Rien trouvé</EmptyTitle>
              <EmptyDescription>
                Essayez moins de mots, ou élargissez le département. Notre base ne
                contient que les offres collectées ces 30 derniers jours pour les
                recherches des candidats.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          visible.map((offer) => <JobMatchCard key={offer.job.id} match={offer} />)
        )}

        {lastPage > 1 ? (
          <div className="flex items-center justify-between gap-2 pb-4">
            <Button asChild variant="outline" disabled={page <= 1}>
              <Link href={pageHref(filters, page - 1)}>Page précédente</Link>
            </Button>
            <Button asChild variant="outline" disabled={page >= lastPage}>
              <Link href={pageHref(filters, page + 1)}>Page suivante</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}

function pageHref(
  filters: Record<string, string | undefined>,
  page: number
): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "page") query.set(key, value)
  }
  if (page > 1) query.set("page", String(page))

  const suffix = query.toString()

  return suffix ? `/offres?${suffix}` : "/offres"
}
