"use client"

import { XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OfferSkills } from "@/components/job-search/offer-skills"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import { CONTRACT_LABELS } from "@/lib/job-labels"
import type { JobCardOffer } from "@/lib/job-search"

export function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  if (score >= 55) return "bg-amber-500/10 text-amber-600 dark:text-amber-400"

  return "bg-muted text-muted-foreground"
}

export function companyLabel(offer: JobCardOffer) {
  return offer.job.companyAnonymous
    ? "Entreprise non communiquée"
    : offer.job.companyName
}

/**
 * One offer, compact enough to put three on a line.
 *
 * Everything that takes reading — the description, the links, applying — lives
 * in the detail panel: a card the candidate scans has to be comparable with
 * the two next to it, which a wall of text is not.
 *
 * Only "Pas pour moi" stays here, because discarding is the one action worth
 * doing without opening anything.
 */
export function OfferCard({
  offer,
  onOpen,
  onDismiss,
  dismissing,
}: {
  offer: JobCardOffer
  onOpen: () => void
  onDismiss: () => void
  dismissing: boolean
}) {
  const { job } = offer
  const saved = offer.status === "saved"

  return (
    <Card
      className={`@container/card rise-in relative h-full transition-[box-shadow,transform] duration-200 ease-spark hover:-translate-y-0.5 hover:shadow-raised ${
        saved ? "border-primary/40" : ""
      }`}
    >
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-medium">{job.title}</h3>
            <p className="text-muted-foreground truncate text-sm">
              {companyLabel(offer)}
            </p>
          </div>
          {offer.score === null ? null : (
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-sm font-medium ${scoreTone(offer.score)}`}
              title="Score de correspondance avec votre recherche"
            >
              {offer.score}/100
            </span>
          )}
        </div>

        {/* Some sources list a dozen cities in one advert: clamped here so a
            card stays comparable with its neighbours, in full in the panel. */}
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {job.locationLabel || "Lieu non précisé"}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {CONTRACT_LABELS[job.contractType] ?? job.contractType}
          </Badge>
          {job.remote ? <Badge variant="secondary">Télétravail</Badge> : null}
          {job.salaryLabel ? (
            <Badge variant="secondary">{job.salaryLabel}</Badge>
          ) : null}
          {saved ? <Badge variant="outline">Gardée</Badge> : null}
          {offer.status === "applied" ? (
            <Badge variant="outline">Candidature créée</Badge>
          ) : null}
        </div>

        <OfferSkills offer={offer} compact />

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="text-muted-foreground text-xs">
            {/* Never shown before: an offer from this morning and one from
                three weeks ago are not worth the same effort. */}
            Publiée le {formatDate(job.publishedAt ?? job.firstSeenAt)}
          </span>
          <Button
            className="relative z-10"
            size="icon-sm"
            variant="ghost"
            disabled={dismissing}
            onClick={onDismiss}
            title="Pas pour moi"
          >
            <XIcon />
            <span className="sr-only">Écarter cette offre</span>
          </Button>
        </div>

        {/* The whole card opens the panel. An overlaid button rather than a
            wrapping one: a button cannot legally contain the discard button. */}
        <button
          type="button"
          className="absolute inset-0 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={onOpen}
        >
          <span className="sr-only">Voir le détail de l&apos;offre {job.title}</span>
        </button>
      </CardContent>
    </Card>
  )
}
