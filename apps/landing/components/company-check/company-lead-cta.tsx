"use client"

import { Building2Icon } from "lucide-react"

import { ToolLeadCta } from "@/components/tools/tool-lead-cta"
import type { CompanyCheckDictionary } from "@/content/company-check/types"
import type { LandingDictionary } from "@/content/types"
import { postCompanyCheckLead } from "@/lib/company-check-client"

/**
 * "See the companies that hire" (US-139): the link carries the SIREN
 * checked. Shared by the tool and the company pages (US-140).
 */
export function CompanyLeadCta({
  siren,
  ...props
}: {
  dictionary: Pick<CompanyCheckDictionary, "cta" | "lead">
  errors: LandingDictionary["ats"]
  siren: string
  onCtaClick?: () => void
  onLeadSent?: () => void
}) {
  return (
    <ToolLeadCta
      {...props}
      icon={<Building2Icon />}
      submit={(email, consent) => postCompanyCheckLead(email, consent, siren)}
    />
  )
}
