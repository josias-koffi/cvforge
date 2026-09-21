import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"

/** Rehydrates the studio after a reload, from the session id in the URL. */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]">
) {
  const { sessionId } = await context.params
  const response = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}`
  )

  return new NextResponse(await response.text(), {
    headers: { "content-type": "application/json" },
    status: response.status,
  })
}
