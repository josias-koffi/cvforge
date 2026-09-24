"use client"

import { useId, useState } from "react"

import { LockOpenIcon } from "lucide-react"

import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import type { AtsUnlockResult } from "@/lib/ats-api"
import { postUnlock, scanErrorMessage } from "@/lib/ats-client"
import { cn } from "@/lib/utils"

/**
 * Trades the email for the detailed report.
 *
 * The consent box is not decoration: submitting creates a CVSpark account and
 * sends a sign-in link, so it carries the same explicit agreement the login
 * form asks for — and the API refuses the request without it.
 */
export function UnlockForm({
  dictionary,
  scanId,
  onUnlocked,
}: {
  dictionary: LandingDictionary["ats"]
  scanId: string
  onUnlocked: (result: AtsUnlockResult) => void
}) {
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailId = useId()
  const consentId = useId()

  async function submit(event: React.FormEvent) {
    event.preventDefault()

    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      onUnlocked((await postUnlock(scanId, email, consent)) as AtsUnlockResult)
    } catch (caught) {
      setError(scanErrorMessage(caught, dictionary))
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-4 space-y-3" noValidate onSubmit={submit}>
      <p className="text-sm text-muted-foreground">{dictionary.unlock.body}</p>

      <div>
        <label className="block text-sm font-medium" htmlFor={emailId}>
          {dictionary.unlock.emailLabel}
        </label>
        <input
          autoComplete="email"
          className="mt-1 w-full rounded-lg border bg-background p-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          id={emailId}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={dictionary.unlock.emailPlaceholder}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          checked={consent}
          className="mt-1 size-4 rounded border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          id={consentId}
          onChange={(event) => setConsent(event.target.checked)}
          required
          type="checkbox"
        />
        <label className="text-sm text-muted-foreground" htmlFor={consentId}>
          {dictionary.unlock.consent}
        </label>
      </div>

      <Button
        className={cn("h-10 w-full", sparkPendingClassName(submitting))}
        disabled={submitting || !consent || email.trim().length === 0}
        type="submit"
        variant="spark"
      >
        <SparkPending
          pending={submitting}
          pendingLabel={dictionary.unlock.submitting}
        >
          <LockOpenIcon />
          {dictionary.unlock.submit}
        </SparkPending>
      </Button>

      <p aria-live="polite" className="text-sm text-destructive" role="status">
        {error}
      </p>
    </form>
  )
}
