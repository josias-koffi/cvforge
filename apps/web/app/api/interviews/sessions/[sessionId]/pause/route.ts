import type { NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"
/** `apiRequest` reads cookies and the API is on the internal Docker network. */
export const runtime = "nodejs"
export const fetchCache = "force-no-store"

/** Hangs the live call up and stops the interview's clock until it resumes. */
export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/interviews/sessions/[sessionId]/pause">
) {
  const { sessionId } = await context.params

  const upstream = await apiRequest(
    `/interviews/sessions/${encodeURIComponent(sessionId)}/pause`,
    { method: "POST" }
  )

  return new Response(upstream.body, {
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
    status: upstream.status,
  })
}
