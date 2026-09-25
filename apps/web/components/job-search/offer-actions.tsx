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
import { applyLabel } from "@/components/job-search/offer-details"
import { Button } from "@/components/ui/button"
import { SheetFooter } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import type { JobCardOffer } from "@/lib/job-search"

/**
 * The panel's footer: apply through CVForge, apply where the offer really
 * leads — France Travail often only relays it — or keep or drop it.
 */
export function OfferActions({
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
  const { job, details } = offer
  const applied = offer.status === "applied"
  const saved = offer.status === "saved"

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
    <SheetFooter className="sticky bottom-0 mt-auto flex-row flex-wrap items-center justify-between gap-2 border-t bg-popover px-6 py-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={applying || applied} onClick={apply}>
          {applying ? <Spinner /> : <SparklesIcon />}
          {applied ? "Candidature créée" : "Postuler avec CVSpark"}
        </Button>
        {details?.apply ? (
          <Button asChild variant="outline">
            <a
              href={details.apply.url}
              target="_blank"
              rel="noreferrer"
              title={details.apply.host}
            >
              <ExternalLinkIcon />
              {applyLabel(details)}
            </a>
          </Button>
        ) : null}
        {details?.apply?.url === job.primaryUrl ? null : (
          <Button asChild variant="outline">
            <a href={job.primaryUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Voir l&apos;offre
            </a>
          </Button>
        )}
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
  )
}
