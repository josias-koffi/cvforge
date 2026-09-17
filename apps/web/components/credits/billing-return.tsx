"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

/** The webhook usually credits the balance within seconds of the redirect. */
const REFRESH_DELAYS_MS = [2_000, 6_000]

/** Handles `?billing=success|cancelled` on the way back from Stripe Checkout. */
export function BillingReturn() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const billing = searchParams.get("billing")

  useEffect(() => {
    if (billing !== "success" && billing !== "cancelled") return

    if (billing === "success") {
      toast.success("Paiement confirmé. Vos crédits arrivent dans quelques secondes.")
    } else {
      toast.info("Paiement annulé : aucun montant n'a été prélevé.")
    }

    router.replace(pathname, { scroll: false })

    if (billing !== "success") return

    const timers = REFRESH_DELAYS_MS.map((delay) => setTimeout(() => router.refresh(), delay))
    return () => timers.forEach(clearTimeout)
  }, [billing, pathname, router])

  return null
}
