import { NextResponse } from "next/server"

import { appUrl } from "@/lib/links"

// Read APP_URL per request so one image can target any deployment.
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.redirect(appUrl("/login"), 307)
}
