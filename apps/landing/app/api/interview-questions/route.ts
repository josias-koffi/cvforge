import { interviewQuestionsEndpoint } from "@/lib/ats-api"
import { relayJson } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** One short model call, with the API's retries and fallback models behind it. */
export const maxDuration = 60

/** The likely interview questions for a pasted offer (US-141). */
export function POST(request: Request) {
  return relayJson(request, interviewQuestionsEndpoint())
}
