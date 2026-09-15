"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

const errors: Record<string, string> = {
  "export-failed": "L'export a échoué. Réessayez dans un instant.",
}

const messages: Record<string, string> = {
  "cv-generated": "CV généré par l'IA.",
  "letter-generated": "Lettre de motivation générée par l'IA.",
  "offer-created": "Offre importée et analysée par l'IA.",
  "offer-updated": "Offre mise à jour.",
  "profile-saved": "Profil enregistré.",
}

/** Shows a toast for `?notice=` set by a server action redirect, then cleans the URL. */
export function FlashToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const notice = searchParams.get("notice")

  useEffect(() => {
    if (!notice) return

    const message = messages[notice]
    if (message) toast.success(message)
    if (errors[notice]) toast.error(errors[notice])

    const params = new URLSearchParams(searchParams)
    params.delete("notice")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [notice, pathname, router, searchParams])

  return null
}
