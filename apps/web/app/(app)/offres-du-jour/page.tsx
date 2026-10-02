import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { OfferGrid } from "@/components/job-search/offer-grid"
import { OffersVisitMarker } from "@/components/job-search/offers-visit-marker"
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
import { loadDigest, loadRecentMatches, type JobMatch } from "@/lib/job-search"
import { OFFERS_VISIT_COOKIE, splitSinceVisit } from "@/lib/offer-freshness"

export const metadata: Metadata = { title: "Offres du jour" }

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00Z`))
}

export default async function DailyJobsPage() {
  const digest = await loadDigest()
  // Nothing today does not mean nothing at all: a run that found no new offer
  // should still show what was proposed on the previous mornings.
  const matches: JobMatch[] =
    digest.matches.length > 0 ? digest.matches : await loadRecentMatches()
  const showingToday = digest.matches.length > 0
  const visible = matches.filter((match) => match.status !== "dismissed")
  // What arrived since the candidate last left this page goes first (US-167).
  const lastVisit = (await cookies()).get(OFFERS_VISIT_COOKIE)?.value
  const { fresh, rest } = splitSinceVisit(
    visible,
    lastVisit ? decodeURIComponent(lastVisit) : null
  )

  return (
    <>
      <PageHeader
        title="Offres du jour"
        description={
          showingToday
            ? `Votre sélection du ${formatDate(digest.digestDate)}, d'après votre recherche.`
            : "Les dernières offres qui correspondaient à votre recherche."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/offres">
                <SearchIcon />
                Rechercher une offre
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ma-recherche">Ma recherche</Link>
            </Button>
          </div>
        }
      />
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Aucune offre pour l&apos;instant</EmptyTitle>
              <EmptyDescription>
                Décrivez ce que vous cherchez — postes visés, contrats, lieux —
                et activez les offres du jour. La sélection arrive le lendemain
                matin.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/ma-recherche">Configurer ma recherche</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/offres">Chercher par moi-même</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {fresh.length > 0 ? (
              <section
                aria-labelledby="fresh-offers-title"
                className="flex flex-col gap-3"
              >
                <h2 id="fresh-offers-title" className="text-base font-semibold">
                  Nouvelles depuis votre dernière visite
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {fresh.length}
                  </span>
                </h2>
                <OfferGrid offers={fresh} fresh />
              </section>
            ) : null}
            {fresh.length > 0 && rest.length > 0 ? (
              <h2 className="pt-2 text-base font-semibold">
                Vos autres offres
              </h2>
            ) : null}
            <OfferGrid offers={rest} />
            <p className="pb-4 text-xs text-muted-foreground">
              Offres issues de France Travail et des sites des entreprises.
              Chaque lien renvoie à l&apos;annonce d&apos;origine.
            </p>
          </>
        )}
      </div>
      <OffersVisitMarker />
    </>
  )
}
