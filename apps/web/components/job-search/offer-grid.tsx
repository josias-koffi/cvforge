"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setMatchStatus } from "@/app/(app)/offres-du-jour/actions"
import { OfferCard } from "@/components/job-search/offer-card"
import { OfferSheet } from "@/components/job-search/offer-sheet"
import type { JobCardOffer } from "@/lib/job-search"

/** The URL parameter that holds the open offer. */
export const OFFER_PARAM = "offre"

/**
 * The offers as a grid, with the detail panel beside them.
 *
 * The open offer lives in the URL so that the browser's Back button closes the
 * panel and a panel can be linked to — but it is read here, on the client, and
 * never on the server: these pages are uncached, and a server read would go
 * back to the API each time a panel opens or closes.
 *
 * Known limit: a link to an offer that is not on the page shows nothing, since
 * there is no endpoint for a single offer.
 */
export function OfferGrid({ offers }: { offers: JobCardOffer[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [dismissing, startDismissing] = useTransition()

  const visible = offers.filter(
    (offer) => offer.status !== "dismissed" && !dismissed.includes(offer.job.id)
  )
  const openId = params.get(OFFER_PARAM)
  const open = visible.find((offer) => offer.job.id === openId) ?? null

  const show = (jobId: string | null) => {
    const next = new URLSearchParams(params.toString())

    if (jobId) next.set(OFFER_PARAM, jobId)
    else next.delete(OFFER_PARAM)

    const suffix = next.toString()
    // No scroll reset: the candidate must find the list where they left it.
    router.push(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false })
  }

  const dismiss = (jobId: string) =>
    startDismissing(async () => {
      const result = await setMatchStatus(jobId, "dismissed")

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setDismissed((current) => [...current, jobId])
    })

  return (
    <>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {visible.map((offer) => (
          <OfferCard
            key={offer.job.id}
            offer={offer}
            dismissing={dismissing}
            onDismiss={() => dismiss(offer.job.id)}
            onOpen={() => show(offer.job.id)}
          />
        ))}
      </div>

      <OfferSheet
        offer={open}
        onClose={() => show(null)}
        onDismissed={(jobId) => {
          setDismissed((current) => [...current, jobId])
          show(null)
        }}
      />
    </>
  )
}
