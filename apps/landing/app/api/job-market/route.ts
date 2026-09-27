import { jobMarketEndpoint } from "@/lib/ats-api"
import { relayQuery } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** One job in one department, read from the API's copy (US-137). */
export function GET(request: Request) {
  return relayQuery(request, jobMarketEndpoint(), ["appellation", "department"])
}
