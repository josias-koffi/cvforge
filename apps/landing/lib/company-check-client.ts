import type {
  PublicCompanyCheckResponse,
  PublicCompanyCheckSearch,
} from "@cvforge/types"

import { callBff } from "@/lib/ats-client"

/** The Annuaire's own floor; a SIREN is 9 characters anyway. */
export const MIN_COMPANY_QUERY_CHARS = 3

export async function searchCompanies(query: string) {
  const params = new URLSearchParams({ q: query })

  return (await callBff(
    `/api/company-check?${params}`,
    {}
  )) as PublicCompanyCheckSearch
}

export async function fetchCompany(siren: string) {
  return (await callBff(
    `/api/company-check/${encodeURIComponent(siren)}`,
    {}
  )) as PublicCompanyCheckResponse
}

/** Sends the magic link that opens the companies that hire (US-139). */
export async function postCompanyCheckLead(
  email: string,
  consentAccepted: boolean,
  siren: string
) {
  await callBff("/api/company-check/lead", {
    body: JSON.stringify({ consentAccepted, email, siren }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}
