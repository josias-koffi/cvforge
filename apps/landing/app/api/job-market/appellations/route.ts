import { jobMarketEndpoint } from "@/lib/ats-api"
import { relayQuery } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** The job autocomplete, from the API's local ROME copy (US-137). */
export function GET(request: Request) {
  return relayQuery(request, `${jobMarketEndpoint()}/appellations`, ["q"])
}
