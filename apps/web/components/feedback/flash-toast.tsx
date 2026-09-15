"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ZapIcon } from "lucide-react"

const errors: Record<string, string> = {
  "export-failed": "L'export a échoué. Réessayez dans un instant.",
}

/** AI results: celebrated with the amber spark. */
const sparks: Record<string, string> = {
  "cv-generated": "Votre CV est prêt. Relisez-le, ajustez, exportez.",
  "letter-generated": "Votre lettre est prête. À vous de la peaufiner.",
  "offer-created": "Candidature créée : l'offre est analysée.",
}

const messages: Record<string, string> = {
  "offer-updated": "Candidature mise à jour.",
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

    if (sparks[notice]) {
      toast.success(sparks[notice], {
        className: "spark",
        icon: <ZapIcon className="size-4 text-spark" />,
      })
    }
    if (messages[notice]) toast.success(messages[notice])
    if (errors[notice]) toast.error(errors[notice])

    const params = new URLSearchParams(searchParams)
    params.delete("notice")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [notice, pathname, router, searchParams])

  return null
}
