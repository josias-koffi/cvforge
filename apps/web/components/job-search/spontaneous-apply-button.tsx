"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import { applySpontaneously } from "@/app/(app)/entreprises/actions"
import { Button } from "@/components/ui/button"

/**
 * Opens a spontaneous application to this company (US-120), or the one
 * already made, and hands the candidate to the usual CV and letter flow.
 */
export function SpontaneousApplyButton({
  profileId,
  siret,
  companyName,
  className = "self-start",
  variant = "outline",
}: {
  profileId: string
  siret: string
  companyName: string
  className?: string
  /** "default" where it is the page's main action. */
  variant?: "default" | "outline"
}) {
  const router = useRouter()
  const [pending, startApplying] = useTransition()

  const apply = () =>
    startApplying(async () => {
      const result = await applySpontaneously(profileId, siret)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(
        result.existing
          ? "Votre candidature spontanée existe déjà : la voici."
          : "Candidature spontanée créée. Générez votre CV et votre lettre."
      )
      router.push(`/candidatures/${result.applicationId}`)
    })

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={className}
      disabled={pending}
      aria-label={`Candidature spontanée chez ${companyName}`}
      onClick={apply}
    >
      <SendIcon />
      Candidature spontanée
    </Button>
  )
}
