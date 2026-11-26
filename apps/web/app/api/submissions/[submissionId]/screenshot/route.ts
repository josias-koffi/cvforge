import { NextResponse } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The screenshot of a confirmation page (US-198). A route handler: an
 * `<img>` cannot send the httpOnly session cookie to the API itself.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await context.params
  if (!UUID.test(submissionId)) return new NextResponse(null, { status: 404 })

  const response = await apiRequest(
    `/applications/submissions/${submissionId}/screenshot`
  )
  const contentType = response.headers.get("content-type") ?? ""
  if (!response.ok || !contentType.startsWith("image/")) {
    return new NextResponse(null, { status: response.ok ? 404 : response.status })
  }

  return new NextResponse(response.body, {
    headers: {
      "cache-control": "private, max-age=86400",
      "content-type": contentType,
      "x-content-type-options": "nosniff",
    },
  })
}
