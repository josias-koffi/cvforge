"use client"

import { useState } from "react"
import { ExternalLinkIcon } from "lucide-react"

import { AiReason, MatchScoreDetail } from "@/components/job-search/match-score"
import { CompanyMark } from "@/components/job-search/company-mark"
import { OfferActions } from "@/components/job-search/offer-actions"
import {
  CompanyWebsiteLink,
  OfferBenefits,
  OfferCompany,
  OfferContact,
  OfferProfile,
  OfferSections,
  OfferSource,
} from "@/components/job-search/offer-details"
import { companyLabel, companyName } from "@/components/job-search/offer-card"
import { OfferMeta } from "@/components/job-search/offer-meta"
import { OfferSkills } from "@/components/job-search/offer-skills"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDate } from "@/lib/format"
import { SOURCE_LABELS } from "@/lib/job-labels"
import type { JobCardOffer } from "@/lib/job-search"

/**
 * The full offer, beside the list.
 *
 * Everything shown here already travels in the page's payload — description
 * and structured details included — so opening the panel costs no request.
 *
 * At least 45% of the screen: the advert is the one long text of the page,
 * and it has to be read, not scrolled through a slot. The width classes carry
 * the same `data-[side=right]` modifiers as the Sheet's own, or theirs win.
 */
export function OfferSheet({
  offer,
  onClose,
  onDismissed,
  onSaved,
}: {
  offer: JobCardOffer | null
  onClose: () => void
  onDismissed: (jobId: string) => void
  onSaved: (jobId: string) => void
}) {
  // The last offer stays on screen while the panel slides out, instead of
  // the panel emptying itself before it has left.
  const [last, setLast] = useState(offer)
  if (offer && offer !== last) setLast(offer)
  const shown = offer ?? last

  return (
    <Sheet
      open={offer !== null}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      <SheetContent className="@container gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:w-[max(45vw,36rem)] data-[side=right]:sm:max-w-full">
        {shown ? (
          <OfferDetail
            offer={shown}
            onDismissed={onDismissed}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function OfferDetail({
  offer,
  onDismissed,
  onSaved,
}: {
  offer: JobCardOffer
  onDismissed: (jobId: string) => void
  onSaved: (jobId: string) => void
}) {
  const { job, details } = offer
  const openListings = offer.listings.filter((listing) => !listing.closedAt)

  return (
    <>
      <SheetHeader className="gap-4 border-b p-6">
        <div className="flex items-center gap-3 pr-8">
          <CompanyMark
            name={companyName(offer)}
            logoUrl={offer.job.companyLogoUrl}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetDescription className="text-sm font-medium text-foreground">
              {companyLabel(offer)}
            </SheetDescription>
            {details?.companyWebsite ? (
              <CompanyWebsiteLink url={details.companyWebsite} />
            ) : null}
          </div>
        </div>
        <SheetTitle className="text-xl leading-snug font-semibold">
          {job.title}
        </SheetTitle>
        <OfferMeta
          job={{
            ...job,
            // Some boards give their pay only in the structured fields.
            salaryLabel: job.salaryLabel || (details?.salary?.label ?? ""),
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <OfferSource
            source={details?.source ?? offer.listings[0]?.source ?? ""}
            via={details?.via}
          />
          {details?.lacksCandidates ? (
            <Badge variant="secondary">Peu de candidats</Badge>
          ) : null}
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-6 p-6">
        {offer.score === null ? (
          offer.aiReason ? (
            <AiReason reason={offer.aiReason} />
          ) : null
        ) : (
          <MatchScoreDetail
            score={offer.score}
            breakdown={offer.scoreBreakdown}
            aiReason={offer.aiReason}
          />
        )}

        <OfferSkills offer={offer} />

        {/* The place itself is in the header; here, what helps to place it. */}
        <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4 text-sm @lg:grid-cols-3">
          {details?.facts.map((fact) => (
            <Detail key={fact.label} label={fact.label}>
              {fact.value}
            </Detail>
          ))}
          <Detail label="Publiée le">{formatDate(job.publishedAt)}</Detail>
          <Detail label="Vue pour la première fois">
            {formatDate(job.firstSeenAt)}
          </Detail>
          {job.department ? (
            <Detail label="Département">{job.department}</Detail>
          ) : null}
          {job.latitude !== null && job.longitude !== null ? (
            <Detail label="Sur une carte">
              <a
                className="underline underline-offset-4"
                href={`https://www.openstreetmap.org/?mlat=${job.latitude}&mlon=${job.longitude}#map=13/${job.latitude}/${job.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Voir le lieu
              </a>
            </Detail>
          ) : null}
        </dl>

        {details ? <OfferBenefits details={details} /> : null}
        {details ? <OfferProfile details={details} /> : null}

        <Separator />

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">L&apos;annonce</h3>
          {job.description ? (
            // Collected as plain text, so the line breaks are all the shape
            // there is — and nothing from a third party is rendered as HTML.
            // The panel's full width: it is already sized to be read.
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">
              {job.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cette source ne publie pas de description. Le lien « Voir
              l&apos;offre » mène à l&apos;annonce complète.
            </p>
          )}
        </section>

        {details ? <OfferSections details={details} /> : null}
        {details ? <OfferCompany details={details} /> : null}
        {details ? <OfferContact details={details} /> : null}

        {openListings.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Où lire l&apos;offre</h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {openListings.map((listing) => (
                <li key={listing.id}>
                  <a
                    href={listing.url || listing.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    {SOURCE_LABELS[listing.source] ?? listing.source}
                    <ExternalLinkIcon className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <OfferActions offer={offer} onDismissed={onDismissed} onSaved={onSaved} />
    </>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
