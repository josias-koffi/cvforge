import type { PublicKeywordMatchResponse } from "@cvforge/types"

import { callBff } from "@/lib/ats-client"

/** Same floor as the API: a job title alone makes a meaningless comparison. */
export const MIN_OFFER_CHARS = 200
/** Same cap as the API, which cuts anything longer. */
export const MAX_OFFER_CHARS = 8000

export async function postKeywordMatch(file: File, offerText: string) {
  const body = new FormData()

  body.append("cvFile", file)
  body.append("offerText", offerText)

  return (await callBff("/api/keyword-match", {
    body,
    method: "POST",
  })) as PublicKeywordMatchResponse
}

/** Sends the magic link that opens an application for this offer (US-136). */
export async function postKeywordMatchLead(
  email: string,
  consentAccepted: boolean,
  offerText: string
) {
  await callBff("/api/keyword-match/lead", {
    body: JSON.stringify({ consentAccepted, email, offerText }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}
