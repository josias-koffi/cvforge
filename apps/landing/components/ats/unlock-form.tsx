"use client"

import { LockOpenIcon } from "lucide-react"

import { EmailConsentForm } from "@/components/ats/email-consent-form"
import type { LandingDictionary } from "@/content/types"
import type { AtsUnlockResult } from "@/lib/ats-api"
import { postUnlock, scanErrorMessage } from "@/lib/ats-client"

/** Trades the email for the detailed report. */
export function UnlockForm({
  dictionary,
  scanId,
  onUnlocked,
}: {
  dictionary: LandingDictionary["ats"]
  scanId: string
  onUnlocked: (result: AtsUnlockResult) => void
}) {
  return (
    <EmailConsentForm
      errorMessage={(error) => scanErrorMessage(error, dictionary)}
      icon={<LockOpenIcon />}
      labels={dictionary.unlock}
      onSubmit={async (email, consent) =>
        onUnlocked(
          (await postUnlock(scanId, email, consent)) as AtsUnlockResult
        )
      }
    />
  )
}
