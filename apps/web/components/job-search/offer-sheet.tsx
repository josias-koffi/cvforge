"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  BookmarkIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ThumbsDownIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  applyToMatch,
  setMatchStatus,
} from "@/app/(app)/offres-du-jour/actions"
import { AiReason, MatchScoreDetail } from "@/components/job-search/match-score"
import { CompanyMark } from "@/components/job-search/company-mark"
import { companyLabel, companyName } from "@/components/job-search/offer-card"
import { OfferMeta } from "@/components/job-search/offer-meta"
import { OfferSkills } from "@/components/job-search/offer-skills"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { formatDate } from "@/lib/format"
import { SOURCE_LABELS } from "@/lib/job-labels"
import type { JobCardOffer } from "@/lib/job-search"

/**
 * The full offer, beside the list.
 *
 * Everything shown here already travels in the page's payload — description
 * included, cleaned at collection time — so opening the panel costs no
 * request. That is why the open offer is read from the URL on the client: a
 * server read would re-fetch the whole page on every open and close.
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
  return (
    <Sheet
      open={offer !== null}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      <SheetContent className="@container gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:w-[max(45vw,36rem)] data-[side=right]:sm:max-w-full">
        {offer ? (
          <OfferDetail
            offer={offer}
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
  const router = useRouter()
  const [applying, startApplying] = useTransition()
  const [updating, startUpdating] = useTransition()
  const { job } = offer
  const applied = offer.status === "applied"
  const saved = offer.status === "saved"
  const openListings = offer.listings.filter((listing) => !listing.closedAt)

  const apply = () =>
    startApplying(async () => {
      const result = await applyToMatch(job.id)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success("Candidature créée. À vous de jouer.")
      router.push(`/candidatures/${result.applicationId}`)
    })

  const update = (status: "saved" | "dismissed") =>
    startUpdating(async () => {
      const result = await setMatchStatus(job.id, status)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      if (status === "dismissed") onDismissed(job.id)
      else onSaved(job.id)
    })

  return (
    <>
      <SheetHeader className="gap-4 border-b p-6">
        <div className="flex items-center gap-3 pr-8">
          <CompanyMark
            name={companyName(offer)}
            logoUrl={offer.job.companyLogoUrl}
          />
          <SheetDescription className="text-sm font-medium text-foreground">
            {companyLabel(offer)}
          </SheetDescription>
        </div>
        <SheetTitle className="text-xl leading-snug font-semibold">
          {job.title}
        </SheetTitle>
        <OfferMeta job={job} />
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
        <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4 text-sm @lg:grid-cols-4">
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

        <Separator />

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">L&apos;annonce</h3>
          {job.description ? (
            // Collected as plain text, so the line breaks are all the shape
            // there is — and nothing from a third party is rendered as HTML.
            <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-foreground/85">
              {job.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cette source ne publie pas de description. Le lien « Voir
              l&apos;offre » mène à l&apos;annonce complète.
            </p>
          )}
        </section>

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

      <SheetFooter className="sticky bottom-0 mt-auto flex-row flex-wrap items-center justify-between gap-2 border-t bg-popover px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={applying || applied} onClick={apply}>
            {applying ? <Spinner /> : <SparklesIcon />}
            {applied ? "Candidature créée" : "Postuler avec CVForge"}
          </Button>
          <Button asChild variant="outline">
            <a href={job.primaryUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Voir l&apos;offre
            </a>
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            disabled={updating || saved || applied}
            onClick={() => update("saved")}
          >
            <BookmarkIcon />
            {saved ? "Gardée" : "Garder"}
          </Button>
          <Button
            className="text-muted-foreground"
            variant="ghost"
            disabled={updating}
            onClick={() => update("dismissed")}
          >
            <ThumbsDownIcon />
            Pas pour moi
          </Button>
        </div>
      </SheetFooter>
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
