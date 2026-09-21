import {
  INTERVIEW_DEFAULT_DURATION_MINUTES,
  interviewRecruiterProfiles,
  isInterviewDuration,
  supportedLocales,
} from "@cvforge/types"
import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"

/**
 * Opens an interview session.
 *
 * The studio runs in the browser, and the session cookie is httpOnly, so it
 * cannot call the API directly — these handlers forward the cookie for it.
 * Creation is not a server action because the studio needs the session id
 * back without a router revalidation mid-flow.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 })
  }

  const language = supportedLocales.includes(body.language as "fr")
    ? (body.language as string)
    : "fr"
  const profile = interviewRecruiterProfiles.includes(body.profile as "standard")
    ? (body.profile as string)
    : "standard"
  const applicationId =
    typeof body.applicationId === "string" ? body.applicationId : undefined
  // Forwarded like the rest: dropped, the studio silently ran every interview
  // for ten minutes whatever the candidate picked — and now it would also be
  // billed for a length it never got.
  const durationMinutes = isInterviewDuration(body.durationMinutes)
    ? body.durationMinutes
    : INTERVIEW_DEFAULT_DURATION_MINUTES

  const response = await apiRequest("/interviews/sessions", {
    body: { applicationId, durationMinutes, language, profile },
    method: "POST",
  })

  // 402 (no credits left) is relayed as-is: the wizard tells the user why.
  return new NextResponse(await response.text(), {
    headers: { "content-type": "application/json" },
    status: response.status,
  })
}
