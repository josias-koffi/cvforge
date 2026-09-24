"use client"

import { SunriseIcon } from "lucide-react"

import { ToolLeadCta } from "@/components/tools/tool-lead-cta"
import type { LandingDictionary } from "@/content/types"
import { postJobMarketLead } from "@/lib/job-market-client"

/**
 * "Receive this job's offers every morning" (US-137): the link carries the
 * job and the department. Shared by the tool and the job × department pages
 * (US-138).
 */
export function JobMarketLeadCta({
  appellationCode,
  department,
  ...props
}: {
  dictionary: Pick<LandingDictionary["jobMarket"], "cta" | "lead">
  errors: LandingDictionary["ats"]
  appellationCode: string
  department: string
  onCtaClick?: () => void
  onLeadSent?: () => void
}) {
  return (
    <ToolLeadCta
      {...props}
      icon={<SunriseIcon />}
      submit={(email, consent) =>
        postJobMarketLead(email, consent, appellationCode, department)
      }
    />
  )
}
