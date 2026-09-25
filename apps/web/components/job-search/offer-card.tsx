"use client"

import { BookmarkIcon, ThumbsDownIcon } from "lucide-react"
import { memo } from "react"

import { CompanyMark } from "@/components/job-search/company-mark"
import { MatchScoreSummary } from "@/components/job-search/match-score"
import { OfferMeta } from "@/components/job-search/offer-meta"
import { OfferSkills } from "@/components/job-search/offer-skills"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatRelativeDays } from "@/lib/format"
import type { JobCardOffer } from "@/lib/job-search"

/** The company's name, or `null` when the advert does not give it. */
export function companyName(offer: JobCardOffer) {
  return offer.job.companyAnonymous ? null : offer.job.companyName
}

export function companyLabel(offer: JobCardOffer) {
  return companyName(offer) ?? "Entreprise non communiquée"
}

/**
 * One offer, compact enough to put three on a line.
 *
 * Everything that takes reading — the description, the links, applying — lives
 * in the detail panel: a card the candidate scans has to be comparable with
 * the two next to it, which a wall of text is not.
 *
 * Keeping and discarding stay here, in words rather than a bare icon: they are
 * the two actions worth doing without opening anything.
 *
 * Memoised, with handlers that take the offer's id: a page holds up to sixty
 * cards, and opening one offer must not re-render the others.
 */
export const OfferCard = memo(function OfferCard({
  offer,
  onOpen,
  onSave,
  onDismiss,
  pending,
}: {
  offer: JobCardOffer
  onOpen: (jobId: string) => void
  onSave: (jobId: string) => void
  onDismiss: (jobId: string) => void
  pending: boolean
}) {
  const { job } = offer
  const saved = offer.status === "saved"
  const applied = offer.status === "applied"

  return (
    <Card
      className={`@container/card relative h-full rise-in transition-[box-shadow,transform,border-color] duration-200 ease-spark [--card-spacing:--spacing(5)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-raised ${
        saved ? "border-primary/40" : ""
      }`}
    >
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-3">
          <CompanyMark
            name={companyName(offer)}
            logoUrl={offer.job.companyLogoUrl}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-medium">
              {companyLabel(offer)}
            </p>
            <p className="text-xs text-muted-foreground">
              {/* An offer from this morning and one from three weeks ago are
                  not worth the same effort. */}
              Publiée {formatRelativeDays(job.publishedAt ?? job.firstSeenAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="line-clamp-2 text-base leading-snug font-semibold">
            {job.title}
          </h3>
          <OfferMeta job={job} compact />
        </div>

        {offer.score === null ? null : (
          <MatchScoreSummary score={offer.score} />
        )}

        <OfferSkills offer={offer} compact />

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 gap-1.5">
            {saved ? <Badge variant="outline">Gardée</Badge> : null}
            {applied ? (
              <Badge variant="outline">Candidature créée</Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1">
            {saved || applied ? null : (
              <Button
                className="relative z-10"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => onSave(job.id)}
              >
                <BookmarkIcon />
                Garder
              </Button>
            )}
            <Button
              className="relative z-10 text-muted-foreground"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => onDismiss(job.id)}
            >
              <ThumbsDownIcon />
              Pas pour moi
            </Button>
          </div>
        </div>

        {/* The whole card opens the panel. An overlaid button rather than a
            wrapping one: a button cannot legally contain the card's actions. */}
        <button
          type="button"
          className="absolute inset-0 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => onOpen(job.id)}
        >
          <span className="sr-only">
            Voir le détail de l&apos;offre {job.title}
          </span>
        </button>
      </CardContent>
    </Card>
  )
})
