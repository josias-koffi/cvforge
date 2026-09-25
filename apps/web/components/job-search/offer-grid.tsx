"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
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
 * panel and a panel can be linked to. It is written with the History API, not
 * the router: a router navigation re-renders these uncached pages on the
 * server, which went back to the API — and took a second — on every open and
 * close. Next keeps `useSearchParams` in step with `pushState`.
 *
 * Known limit: a link to an offer that is not on the page shows nothing, since
 * there is no endpoint for a single offer.
 */
export function OfferGrid({ offers }: { offers: JobCardOffer[] }) {
  const params = useSearchParams()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [pending, startUpdating] = useTransition()

  // What the candidate just did shows at once, without waiting for a reload.
  // Memoised, like the handlers below, so that opening the panel re-renders
  // the panel and not every card.
  const visible = useMemo(
    () =>
      offers
        .filter(
          (offer) =>
            offer.status !== "dismissed" && !dismissed.includes(offer.job.id)
        )
        .map((offer) => ({
          ...offer,
          // A 0 is an offer the candidate picked by hand: nothing ranked it,
          // and "0 % de correspondance" would claim otherwise.
          score: offer.score ? offer.score : null,
          status:
            saved.includes(offer.job.id) && offer.status !== "applied"
              ? ("saved" as const)
              : offer.status,
        })),
    [offers, dismissed, saved]
  )
  const openId = params.get(OFFER_PARAM)
  const open = visible.find((offer) => offer.job.id === openId) ?? null

  const show = useCallback((jobId: string | null) => {
    const next = new URLSearchParams(window.location.search)

    if (jobId) next.set(OFFER_PARAM, jobId)
    else next.delete(OFFER_PARAM)

    const suffix = next.toString()
    // No scroll reset: the History API leaves the list where it was.
    window.history.pushState(
      null,
      "",
      suffix
        ? `${window.location.pathname}?${suffix}`
        : window.location.pathname
    )
  }, [])

  const update = useCallback(
    (jobId: string, status: "saved" | "dismissed") =>
      startUpdating(async () => {
        const result = await setMatchStatus(jobId, status)

        if (!result.ok) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
        if (status === "dismissed")
          setDismissed((current) => [...current, jobId])
        else setSaved((current) => [...current, jobId])
      }),
    []
  )
  const save = useCallback((jobId: string) => update(jobId, "saved"), [update])
  const dismiss = useCallback(
    (jobId: string) => update(jobId, "dismissed"),
    [update]
  )
  const close = useCallback(() => show(null), [show])
  const dismissedFromPanel = useCallback(
    (jobId: string) => {
      setDismissed((current) => [...current, jobId])
      show(null)
    },
    [show]
  )
  const savedFromPanel = useCallback(
    (jobId: string) => setSaved((current) => [...current, jobId]),
    []
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {visible.map((offer) => (
          <OfferCard
            key={offer.job.id}
            offer={offer}
            pending={pending}
            onSave={save}
            onDismiss={dismiss}
            onOpen={show}
          />
        ))}
      </div>

      <OfferSheet
        offer={open}
        onClose={close}
        onDismissed={dismissedFromPanel}
        onSaved={savedFromPanel}
      />
    </>
  )
}
