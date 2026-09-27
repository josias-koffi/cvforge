import { NextResponse } from "next/server"

import { companyCheckEndpoint } from "@/lib/ats-api"
import { relayQuery } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * One company's record (US-139). Only a SIREN goes into the API's path:
 * anything else is refused here rather than spliced into a URL.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/company-check/[siren]">
) {
  const { siren } = await params

  if (!/^\d{9}$/.test(siren)) {
    return NextResponse.json({ code: null }, { status: 400 })
  }

  return relayQuery(request, `${companyCheckEndpoint()}/${siren}`, [])
}
