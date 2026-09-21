import type { InterviewTranscriptionChunkRequest } from "@cvforge/types"
import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** A long answer is a megabyte of base64 and a few seconds of transcription. */
export const maxDuration = 60

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

/** Uploads one recorded segment for transcription. */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/chunks">
) {
  const { sessionId } = await context.params

  let body: Partial<InterviewTranscriptionChunkRequest>
  try {
    body = (await request.json()) as Partial<InterviewTranscriptionChunkRequest>
  } catch {
    return NextResponse.json({ message: "Segment illisible." }, { status: 400 })
  }

  if (!isChunk(body)) {
    // Rejected here rather than upstream: an incomplete chunk is a client bug.
    return NextResponse.json({ message: "Segment incomplet." }, { status: 400 })
  }

  const response = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/chunks`,
    { body, method: "POST" }
  )

  return new NextResponse(await response.text(), {
    headers: { "content-type": "application/json" },
    status: response.status,
  })
}
