import type { InterviewTranscriptionChunkRequest } from "@cvforge/types"
import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** `apiRequest` reads cookies and the API is on the internal Docker network. */
export const runtime = "nodejs"
export const fetchCache = "force-no-store"
export const maxDuration = 120

function isChunk(
  value: Partial<InterviewTranscriptionChunkRequest>
): value is InterviewTranscriptionChunkRequest {
  return (
    typeof value.chunkBase64 === "string" &&
    typeof value.chunkId === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.format === "string" &&
    typeof value.isFinal === "boolean" &&
    typeof value.mimeType === "string" &&
    typeof value.sequence === "number" &&
    typeof value.startedAt === "string"
  )
}

/**
 * One spoken turn: the candidate's answer up, the interviewer's voice back.
 *
 * The upstream body is handed straight to the response and never read here —
 * buffering it would hold the voice until the whole reply was generated,
 * which is the several-second silence this design exists to remove.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/turn">
) {
  const { sessionId } = await context.params

  let body: Partial<InterviewTranscriptionChunkRequest>
  try {
    body = (await request.json()) as Partial<InterviewTranscriptionChunkRequest>
  } catch {
    return NextResponse.json({ message: "Segment illisible." }, { status: 400 })
  }

  if (!isChunk(body)) {
    return NextResponse.json({ message: "Segment incomplet." }, { status: 400 })
  }

  const upstream = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/turn`,
    { body, method: "POST" }
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
