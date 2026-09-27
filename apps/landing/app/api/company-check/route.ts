import { companyCheckEndpoint } from "@/lib/ats-api"
import { relayQuery } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** A search of the Annuaire des entreprises, by name or SIREN (US-139). */
export function GET(request: Request) {
  return relayQuery(request, companyCheckEndpoint(), ["q"])
}
