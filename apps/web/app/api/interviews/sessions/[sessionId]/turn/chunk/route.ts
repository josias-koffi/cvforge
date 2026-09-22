import type { InterviewAnswerPartRequest } from "@cvforge/types"
import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** `apiRequest` reads cookies and the API is on the internal Docker network. */
export const runtime = "nodejs"
export const fetchCache = "force-no-store"

function isPart(
  value: Partial<InterviewAnswerPartRequest>
): value is InterviewAnswerPartRequest {
  return (
    typeof value.audioBase64 === "string" &&
    typeof value.chunkId === "string" &&
    typeof value.part === "number"
  )
}

/**
 * One piece of an answer, on its way up while the candidate is still talking.
 *
 * Ordinary JSON, unlike the turn beside it: a quarter of a second of audio
 * goes up and a count comes back, with nothing to stream in either direction.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/turn/chunk">
) {
  const { sessionId } = await context.params

  let body: Partial<InterviewAnswerPartRequest>
  try {
    body = (await request.json()) as Partial<InterviewAnswerPartRequest>
  } catch {
    return NextResponse.json({ message: "Fragment illisible." }, { status: 400 })
  }

  if (!isPart(body)) {
    return NextResponse.json({ message: "Fragment incomplet." }, { status: 400 })
  }

  const upstream = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/turn/chunk`,
    { body, method: "POST" }
  )

  if (!upstream.ok) {
    return NextResponse.json(
      { message: "Fragment refusé." },
      { status: upstream.status >= 400 ? upstream.status : 502 }
    )
  }

  return NextResponse.json(await upstream.json())
}
