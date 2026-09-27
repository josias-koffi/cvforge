import { companyCheckEndpoint } from "@/lib/ats-api"
import { relayJson } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** "See the companies that hire": email, consent, SIREN (US-139). */
export function POST(request: Request) {
  return relayJson(request, `${companyCheckEndpoint()}/lead`)
}
