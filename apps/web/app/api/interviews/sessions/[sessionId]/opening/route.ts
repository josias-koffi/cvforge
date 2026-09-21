import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** `apiRequest` reads cookies and the API is on the internal Docker network. */
export const runtime = "nodejs"
export const fetchCache = "force-no-store"
export const maxDuration = 120

/**
 * The interviewer's opening words, streamed as they are spoken.
 *
 * Same shape as a turn, minus the candidate's audio: there is none yet. The
 * upstream body is handed straight to the response and never read here —
 * buffering it would hold the greeting until it was fully generated, which is
 * the silence this design exists to remove.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/opening">
) {
  const { sessionId } = await context.params

  const upstream = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/opening`,
    { method: "POST" }
  )

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { message: "Impossible de générer la réponse." },
      { status: upstream.status >= 400 ? upstream.status : 502 }
    )
  }

  return new Response(upstream.body, {
    headers: {
      // `no-transform` is what actually forbids an intermediary from
      // re-aggregating the stream; `no-cache` alone does not.
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  })
}
