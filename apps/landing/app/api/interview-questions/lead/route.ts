import { interviewQuestionsEndpoint } from "@/lib/ats-api"
import { relayJson } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** "Practise out loud with an AI recruiter": email, consent, offer (US-141). */
export function POST(request: Request) {
  return relayJson(request, `${interviewQuestionsEndpoint()}/lead`)
}
