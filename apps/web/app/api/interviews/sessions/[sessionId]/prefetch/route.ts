import { type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"

/**
 * Warms the next question while the candidate is still speaking.
 *
 * Always answers 204: the caller has nothing to do with the outcome, and a
 * failed warm-up costs latency on the next turn, never the session.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/prefetch">
) {
  const { sessionId } = await context.params

  try {
    await apiRequest(
      `/interviews/sessions/${encodeURIComponent(sessionId)}/prefetch`,
      { method: "POST" }
    )
  } catch {
    // Best-effort by design.
  }

  return new Response(null, { status: 204 })
}
