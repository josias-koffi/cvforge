import type {
  PublicJobMarketResponse,
  RomeAppellationOption,
} from "@cvforge/types"

import { callBff } from "@/lib/ats-client"

/** Same floor as the API's referential search. */
export const MIN_JOB_QUERY_CHARS = 2

export async function fetchAppellations(
  query: string,
  signal?: AbortSignal
): Promise<RomeAppellationOption[]> {
  const params = new URLSearchParams({ q: query })
  const payload = (await callBff(`/api/job-market/appellations?${params}`, {
    signal,
  })) as { appellations?: RomeAppellationOption[] }

  return payload.appellations ?? []
}

export async function fetchJobMarket(
  appellationCode: string,
  department: string
) {
  const params = new URLSearchParams({
    appellation: appellationCode,
    department,
  })

  return (await callBff(`/api/job-market?${params}`, {})) as PublicJobMarketResponse
}

/** Sends the magic link that writes this search and turns the digest on. */
export async function postJobMarketLead(
  email: string,
  consentAccepted: boolean,
  appellationCode: string,
  department: string
) {
  await callBff("/api/job-market/lead", {
    body: JSON.stringify({
      appellation: appellationCode,
      consentAccepted,
      department,
      email,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}
