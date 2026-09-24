"use client"

import { useState } from "react"
import { MailCheckIcon, SendIcon, SunriseIcon } from "lucide-react"

import { EmailConsentForm } from "@/components/ats/email-consent-form"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { postJobMarketLead } from "@/lib/job-market-client"

/**
 * "Receive this job's offers every morning" (US-137): the button, then the
 * email and its consent, then "check your inbox". Shared by the tool and the
 * job × department pages (US-138).
 */
export function JobMarketLeadCta({
  dictionary,
  errors,
  appellationCode,
  department,
  onCtaClick = () => undefined,
  onLeadSent = () => undefined,
}: {
  dictionary: Pick<LandingDictionary["jobMarket"], "cta" | "lead">
  errors: LandingDictionary["ats"]
  appellationCode: string
  department: string
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
            await postJobMarketLead(email, consent, appellationCode, department)
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
            <SunriseIcon />
            {dictionary.cta.button}
          </Button>
        </>
      )}
    </section>
  )
}
