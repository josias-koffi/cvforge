"use client"

import { useEffect } from "react"

import { OFFERS_VISIT_COOKIE } from "@/lib/offer-freshness"

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

/** Written when the page opened, so an offer caught during the visit stays new. */
export function writeVisitCookie(openedAt: string) {
  document.cookie = `${OFFERS_VISIT_COOKIE}=${encodeURIComponent(openedAt)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}

/**
 * Remembers the visit to « Offres du jour » (US-167) when the candidate
 * leaves it, not when it opens: saving or dismissing an offer refreshes the
 * page, and the « nouvelles » section must not empty itself under their
 * eyes. The time recorded is the opening's, so whatever arrived while they
 * were reading is still new next time. A cookie, not a server record: it
 * says nothing the server needs to keep.
 */
export function OffersVisitMarker() {
  useEffect(() => {
    const openedAt = new Date().toISOString()
    const mark = () => writeVisitCookie(openedAt)

    // `pagehide` covers a closed tab or a full navigation; the cleanup, a
    // navigation inside the app.
    window.addEventListener("pagehide", mark)
    return () => {
      window.removeEventListener("pagehide", mark)
      mark()
    }
  }, [])

  return null
}
