import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"

/**
 * A company's logo, through the API's cache (ADR-025). A route handler: an
 * `<img>` cannot send the httpOnly session cookie to the API itself.
 *
 * The API decides what may be fetched; this only passes the source along.
 */
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src")
  if (!src) return new NextResponse(null, { status: 404 })

  const response = await apiRequest("/company-logos", { query: { src } })
  const contentType = response.headers.get("content-type") ?? ""

  // Only an image goes back: never an error page shown as a logo.
  if (!response.ok || !contentType.startsWith("image/")) {
    return new NextResponse(null, {
      status: response.ok ? 404 : response.status,
    })
  }

  return new NextResponse(response.body, {
    headers: {
      "cache-control": "private, max-age=604800, immutable",
      "content-type": contentType,
      "x-content-type-options": "nosniff",
    },
  })
}
