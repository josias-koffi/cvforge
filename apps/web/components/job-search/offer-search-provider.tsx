"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react"

import type { OfferSearchFilters } from "@/lib/job-search"
import { OFFER_RESULTS_ID, offerSearchHref } from "@/lib/offer-search"

interface OfferSearchContextValue {
  /** The criteria on screen: the ones asked for, before the server answers. */
  filters: OfferSearchFilters
  /** A search is on its way: the results on screen are no longer the answer. */
  pending: boolean
  /** The name of the city in `filters.ville`: the URL only holds its code. */
  placeName: string | undefined
  search: (
    filters: OfferSearchFilters,
    options?: {
      toResults?: boolean
      /** The city just picked, named before the server says it. */
      place?: { code: string; name: string }
    }
  ) => void
}

const OfferSearchContext = createContext<OfferSearchContextValue | null>(null)

/**
 * The one way the page searches, so every control shares the loader.
 *
 * The page is rendered on the server for each search, and Next keeps the old
 * page on screen while the new one renders: without this, the candidate saw
 * their previous results for the seconds a search takes, with nothing saying
 * a search had started. The navigation runs in a transition whose pending
 * state the results read, and the criteria are applied optimistically — a
 * ticked box stays ticked while the server works.
 */
export function OfferSearchProvider({
  children,
  filters,
  place,
}: {
  children: React.ReactNode
  filters: OfferSearchFilters
  /** The city the server searched around, if any. */
  place: { code: string; name: string } | null
}) {
  const router = useRouter()
  const [pending, startSearch] = useTransition()
  const [shown, setShown] = useOptimistic(filters)
  // Every city named so far, the server's and the ones just picked: a chip
  // reads "Nantes" during the search, not a code.
  const [picked, setPicked] = useState<Record<string, string>>({})
  const names = place ? { ...picked, [place.code]: place.name } : picked

  const search = useCallback<OfferSearchContextValue["search"]>(
    (next, options) => {
      const named = options?.place

      if (named) {
        setPicked((current) => ({ ...current, [named.code]: named.name }))
      }
      if (options?.toResults) {
        document
          .getElementById(OFFER_RESULTS_ID)
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      startSearch(() => {
        setShown(next)
        router.push(offerSearchHref(next), { scroll: false })
      })
    },
    [router, setShown]
  )

  const placeName = shown.ville ? names[shown.ville] : undefined
  const value = useMemo(
    () => ({ filters: shown, pending, placeName, search }),
    [shown, pending, placeName, search]
  )

  return <OfferSearchContext value={value}>{children}</OfferSearchContext>
}

export function useOfferSearch(): OfferSearchContextValue {
  const value = use(OfferSearchContext)

  if (!value) throw new Error("useOfferSearch outside OfferSearchProvider")

  return value
}
