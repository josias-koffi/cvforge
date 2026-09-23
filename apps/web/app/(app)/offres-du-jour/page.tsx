import type { Metadata } from "next"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { JobMatchCard } from "@/components/job-search/job-match-card"
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
          <Button asChild variant="outline">
            <Link href="/profile?tab=search">Ma recherche</Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        {visible.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Aucune offre pour l&apos;instant</EmptyTitle>
              <EmptyDescription>
                Décrivez ce que vous cherchez — postes visés, contrats, lieux — et
                activez les offres du jour. La sélection arrive le lendemain matin.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/profile">Configurer ma recherche</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {visible.map((match) => (
              <JobMatchCard key={match.id} match={match} />
            ))}
            <p className="text-muted-foreground text-xs">
              Offres issues de France Travail et des sites des entreprises. Chaque
              lien renvoie à l&apos;annonce d&apos;origine.
            </p>
          </>
        )}
      </div>
    </>
  )
}
