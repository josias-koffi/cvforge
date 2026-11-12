import { NextResponse } from "next/server"

import { isGtmId } from "@/lib/gtm"

// Read GTM_CONTAINER_ID per request so one image serves every deployment.
export const dynamic = "force-dynamic"

/** The public GTM container id of this deployment, or null when analytics is off. */
export function GET() {
  const value = process.env.GTM_CONTAINER_ID?.trim()
  return NextResponse.json(
    { gtmId: isGtmId(value) ? value : null },
    { headers: { "Cache-Control": "public, max-age=300" } }
  )
}
