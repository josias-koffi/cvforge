import { keywordMatchLeadEndpoint } from "@/lib/ats-api"
import { relayJson } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** "Generate a CV for this offer": the email, the consent and the offer (US-136). */
export function POST(request: Request) {
  return relayJson(request, keywordMatchLeadEndpoint())
}
