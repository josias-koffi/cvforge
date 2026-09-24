"use client"

import { useId, useState, type ReactNode } from "react"

import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type EmailConsentLabels = {
  body: string
  emailLabel: string
  emailPlaceholder: string
  consent: string
  submit: string
  submitting: string
}

/**
 * An email and an explicit consent, the conversion step of every free tool.
 *
 * The consent box is not decoration: submitting creates a CVSpark account and
 * sends a sign-in link, so it carries the same explicit agreement the login
 * form asks for — and the API refuses the request without it.
 */
export function EmailConsentForm({
  labels,
  icon,
  onSubmit,
  errorMessage,
}: {
  labels: EmailConsentLabels
  icon: ReactNode
  /** Resolves once the API accepted; throws what `errorMessage` words. */
  onSubmit: (email: string, consent: boolean) => Promise<void>
  errorMessage: (error: unknown) => string
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
      await onSubmit(email, consent)
    } catch (caught) {
      setError(errorMessage(caught))
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-4 space-y-3" noValidate onSubmit={submit}>
      <p className="text-sm text-muted-foreground">{labels.body}</p>

      <div>
        <label className="block text-sm font-medium" htmlFor={emailId}>
          {labels.emailLabel}
        </label>
        <input
          autoComplete="email"
          className="mt-1 w-full rounded-lg border bg-background p-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          id={emailId}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={labels.emailPlaceholder}
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
          {labels.consent}
        </label>
      </div>

      <Button
        className={cn("h-10 w-full", sparkPendingClassName(submitting))}
        disabled={submitting || !consent || email.trim().length === 0}
        type="submit"
        variant="spark"
      >
        <SparkPending pending={submitting} pendingLabel={labels.submitting}>
          {icon}
          {labels.submit}
        </SparkPending>
      </Button>

      <p aria-live="polite" className="text-sm text-destructive" role="status">
        {error}
      </p>
    </form>
  )
}
