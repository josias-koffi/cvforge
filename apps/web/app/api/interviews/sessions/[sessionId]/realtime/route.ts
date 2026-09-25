import type { InterviewRealtimeCallRequest } from "@cvforge/types"
import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** `apiRequest` reads cookies and the API is on the internal Docker network. */
export const runtime = "nodejs"
export const fetchCache = "force-no-store"

/**
 * Opens the live interview call: the browser's WebRTC offer in, OpenAI's
 * answer out (ADR-026). Only the handshake passes through here — the audio
 * then flows between the browser and OpenAI directly.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/realtime">
) {
  const { sessionId } = await context.params

  let body: Partial<InterviewRealtimeCallRequest>
  try {
    body = (await request.json()) as Partial<InterviewRealtimeCallRequest>
  } catch {
    return NextResponse.json({ message: "Offre illisible." }, { status: 400 })
  }

  if (typeof body.sdp !== "string" || body.sdp.length === 0) {
    return NextResponse.json({ message: "Offre incomplète." }, { status: 400 })
  }

  const upstream = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/realtime`,
    { body: { sdp: body.sdp }, method: "POST" }
  )

  // The API's own message says why — the time is spent, the session is
  // closed — and the studio shows it as is.
  return new Response(upstream.body, {
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
    status: upstream.status,
  })
}
