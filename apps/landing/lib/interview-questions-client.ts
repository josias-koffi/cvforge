import type { PublicInterviewQuestionsResponse } from "@cvforge/types"

import { callBff } from "@/lib/ats-client"

const JSON_HEADERS = { "Content-Type": "application/json" }

/** The questions come back in the page's language, whatever the offer's. */
export async function postInterviewQuestions(
  offerText: string,
  locale: string
) {
  return (await callBff("/api/interview-questions", {
    body: JSON.stringify({ locale, offerText }),
    headers: JSON_HEADERS,
    method: "POST",
  })) as PublicInterviewQuestionsResponse
}

/** Sends the magic link that opens an interview on this offer (US-141). */
export async function postInterviewQuestionsLead(
  email: string,
  consentAccepted: boolean,
  offerText: string
) {
  await callBff("/api/interview-questions/lead", {
    body: JSON.stringify({ consentAccepted, email, offerText }),
    headers: JSON_HEADERS,
    method: "POST",
  })
}
