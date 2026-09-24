import { jobMarketEndpoint } from "@/lib/ats-api"
import { relayJson } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** "Receive this job's offers every morning": email, consent, job, place (US-137). */
export function POST(request: Request) {
  return relayJson(request, `${jobMarketEndpoint()}/lead`)
}
