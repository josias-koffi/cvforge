"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  BookmarkIcon,
  ExternalLinkIcon,
  MapPinIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { applyToMatch, setMatchStatus } from "@/app/(app)/offres-du-jour/actions"
import { companyLabel, scoreTone } from "@/components/job-search/offer-card"
import { Badge } from "@/components/ui/badge"
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
import { CONTRACT_LABELS, SOURCE_LABELS } from "@/lib/job-labels"
import type { JobCardOffer } from "@/lib/job-search"

/**
 * The full offer, beside the list.
 *
 * Everything shown here already travels in the page's payload — description
 * included, cleaned at collection time — so opening the panel costs no
 * request. That is why the open offer is read from the URL on the client: a
 * server read would re-fetch the whole page on every open and close.
 */
export function OfferSheet({
  offer,
  onClose,
  onDismissed,
}: {
  offer: JobCardOffer | null
  onClose: () => void
  onDismissed: (jobId: string) => void
}) {
  return (
    <Sheet open={offer !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {offer ? <OfferDetail offer={offer} onDismissed={onDismissed} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function OfferDetail({
  offer,
  onDismissed,
}: {
  offer: JobCardOffer
  onDismissed: (jobId: string) => void
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
    })

  return (
    <>
      <SheetHeader className="gap-2">
        <SheetTitle className="pr-8 text-lg">{job.title}</SheetTitle>
        <SheetDescription>{companyLabel(offer)}</SheetDescription>
        <div className="flex flex-wrap items-center gap-1.5">
          {offer.score === null ? null : (
            <span
              className={`rounded-md px-2 py-1 text-sm font-medium ${scoreTone(offer.score)}`}
            >
              {offer.score}/100
            </span>
          )}
          <Badge variant="secondary">
            {CONTRACT_LABELS[job.contractType] ?? job.contractType}
          </Badge>
          {job.remote ? <Badge variant="secondary">Télétravail</Badge> : null}
          {job.salaryLabel ? (
            <Badge variant="secondary">{job.salaryLabel}</Badge>
          ) : null}
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 pb-4">
        {offer.aiReason ? (
          <p className="text-muted-foreground flex gap-2 text-sm">
            <SparklesIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {offer.aiReason}
          </p>
        ) : null}

        {offer.matchedSkills && offer.matchedSkills.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Ce qui correspond</h4>
            <div className="flex flex-wrap gap-1.5">
              {offer.matchedSkills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <Separator />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Lieu">
            <span className="flex items-start gap-1.5">
              <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {job.locationLabel || "Non précisé"}
                {job.department ? (
                  <span className="text-muted-foreground block text-xs">
                    Département {job.department}
                  </span>
                ) : null}
              </span>
            </span>
          </Detail>
          <Detail label="Publiée le">{formatDate(job.publishedAt)}</Detail>
          <Detail label="Vue pour la première fois">
            {formatDate(job.firstSeenAt)}
          </Detail>
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

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">L&apos;annonce</h4>
          {job.description ? (
            // Collected as plain text, so the line breaks are all the shape
            // there is — and nothing from a third party is rendered as HTML.
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {job.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Cette source ne publie pas de description. Le lien ci-dessous mène à
              l&apos;annonce complète.
            </p>
          )}
        </div>

        {openListings.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Où lire l&apos;offre</h4>
            <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
              {openListings.map((listing) => (
                <li key={listing.id}>
                  <a
                    href={listing.url || listing.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {SOURCE_LABELS[listing.source] ?? listing.source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <SheetFooter className="bg-popover sticky bottom-0 border-t">
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
          <Button
            variant="ghost"
            disabled={updating || saved}
            onClick={() => update("saved")}
          >
            <BookmarkIcon />
            {saved ? "Gardée" : "Garder"}
          </Button>
          <Button
            variant="ghost"
            disabled={updating}
            onClick={() => update("dismissed")}
          >
            <XIcon />
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
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
