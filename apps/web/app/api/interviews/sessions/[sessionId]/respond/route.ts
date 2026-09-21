import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** `apiRequest` reads cookies and the API is on the internal Docker network. */
export const runtime = "nodejs"
export const fetchCache = "force-no-store"
export const maxDuration = 60

/**
 * Streams the interviewer's reply through, token by token.
 *
 * The upstream body is handed straight to the response and never read here:
 * awaiting `.text()` — or wrapping it in `NextResponse.json` — would buffer
 * the whole answer and the browser would get it in one lump, which defeats
 * speaking it sentence by sentence as it arrives.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/respond">
) {
  const { sessionId } = await context.params
  const upstream = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/respond`
  )

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { message: "Impossible de générer la réponse." },
      { status: upstream.status >= 400 ? upstream.status : 502 }
    )
  }

  return new Response(upstream.body, {
    headers: {
      // `no-transform` is the one that actually forbids an intermediary from
      // re-aggregating the stream; `no-cache` alone does not.
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      // Inert behind Traefik, which does not buffer — but free, and the only
      // thing that saves this if an nginx ever sits in front.
      "x-accel-buffering": "no",
    },
  })
}
