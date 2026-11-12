"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import type { CookieConsentDictionary } from "@/content/cookie-consent/types"
import {
  analyticsCookieRemovals,
  consentCookie,
  OPEN_CONSENT_EVENT,
  parseConsent,
  type ConsentChoice,
} from "@/lib/consent"
import { fetchGtmId, loadGtm, revokeGtm } from "@/lib/gtm"

/** The container id of this deployment once known; null while unknown or when analytics is off. */
function useGtmId() {
  const [gtmId, setGtmId] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void fetchGtmId().then((id) => {
      if (!cancelled) setGtmId(id)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return gtmId
}

/**
 * The cookie banner. Nothing reaches Google before "Accepter": GTM is not even
 * downloaded. Both answers carry the same weight (CNIL), and the footer's
 * "manage cookies" opens the banner again.
 */
export function CookieConsent({
  dict,
  privacyHref,
}: {
  dict: CookieConsentDictionary
  privacyHref: string
}) {
  const [gtmId, setGtmId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    let cancelled = false
    void fetchGtmId().then((id) => {
      if (cancelled || !id) return
      setGtmId(id)
      const choice = parseConsent(document.cookie)
      if (choice === "granted") loadGtm(id)
      if (choice === null) setOpen(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  function choose(choice: ConsentChoice) {
    document.cookie = consentCookie(
      choice,
      window.location.protocol === "https:"
    )
    if (choice === "granted" && gtmId) {
      loadGtm(gtmId)
    } else {
      revokeGtm()
      for (const removal of analyticsCookieRemovals(
        document.cookie,
        window.location.hostname
      )) {
        document.cookie = removal
      }
    }
    setOpen(false)
  }

  if (!gtmId || !open) return null

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border bg-card p-5 shadow-raised sm:inset-x-6"
    >
      <p id={titleId} className="text-sm font-medium">
        {dict.title}
      </p>
      <p id={bodyId} className="mt-2 text-sm text-muted-foreground">
        {dict.body}{" "}
        <Link
          href={privacyHref}
          className="underline underline-offset-4 hover:text-foreground"
        >
          {dict.privacyLink}
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => choose("denied")}>
          {dict.refuse}
        </Button>
        <Button variant="outline" onClick={() => choose("granted")}>
          {dict.accept}
        </Button>
      </div>
    </section>
  )
}

/** "Gérer les cookies", for the footer: only where there are cookies to manage. */
export function CookieSettingsButton({ label }: { label: string }) {
  const gtmId = useGtmId()
  if (!gtmId) return null
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="text-left text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </button>
  )
}
