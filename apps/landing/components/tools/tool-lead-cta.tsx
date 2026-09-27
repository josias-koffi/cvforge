"use client"

import { useState, type ReactNode } from "react"
import { MailCheckIcon, SendIcon } from "lucide-react"

import {
  EmailConsentForm,
  type EmailConsentLabels,
} from "@/components/ats/email-consent-form"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"

/** The wording every free tool's call to action shares. */
export interface ToolLeadCtaDictionary {
  cta: { title: string; body: string; button: string }
  lead: EmailConsentLabels & { success: string; successBody: string }
}

/**
 * A free tool's way on (E23): the button, then the email and its consent,
 * then "check your inbox". Each tool says what the link carries in `submit`.
 */
export function ToolLeadCta({
  dictionary,
  errors,
  icon,
  submit,
  onCtaClick = () => undefined,
  onLeadSent = () => undefined,
}: {
  dictionary: ToolLeadCtaDictionary
  errors: LandingDictionary["ats"]
  /** The button's icon. */
  icon: ReactNode
  submit: (email: string, consentAccepted: boolean) => Promise<void>
  onCtaClick?: () => void
  onLeadSent?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-raised md:p-8">
      <h2 className="text-lg font-medium">{dictionary.cta.title}</h2>
      {sent ? (
        <div className="mt-3 flex items-start gap-3" role="status">
          <MailCheckIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-success"
          />
          <div>
            <p className="font-medium">{dictionary.lead.success}</p>
            <p className="text-sm text-muted-foreground">
              {dictionary.lead.successBody}
            </p>
          </div>
        </div>
      ) : open ? (
        <EmailConsentForm
          errorMessage={(error) => scanErrorMessage(error, errors)}
          icon={<SendIcon />}
          labels={dictionary.lead}
          onSubmit={async (email, consent) => {
            await submit(email, consent)
            setSent(true)
            onLeadSent()
          }}
        />
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">{dictionary.cta.body}</p>
          <Button
            className="mt-4 h-auto min-h-11 w-full text-base whitespace-normal"
            onClick={() => {
              setOpen(true)
              onCtaClick()
            }}
            size="lg"
            type="button"
            variant="spark"
          >
            {icon}
            {dictionary.cta.button}
          </Button>
        </>
      )}
    </section>
  )
}
