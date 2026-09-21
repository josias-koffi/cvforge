import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Hoisted: `vi.mock` is lifted above the imports, so the double has to be too.
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock("@/lib/api", () => ({ apiRequest }))

import { POST as createSession } from "./sessions/route"
import { GET as getSession } from "./sessions/[sessionId]/route"
import { POST as uploadChunk } from "./sessions/[sessionId]/chunks/route"
import { GET as respond } from "./sessions/[sessionId]/respond/route"
import { POST as prefetch } from "./sessions/[sessionId]/prefetch/route"

const CHUNK = {
  chunkBase64: "AAAA",
  chunkId: "c1",
  endedAt: "2026-04-24T13:00:05.000Z",
  format: "wav",
  isFinal: false,
  mimeType: "audio/wav",
  sequence: 1,
  startedAt: "2026-04-24T13:00:00.000Z",
}

function postRequest(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
}

/**
 * `RouteContext` is keyed on the literal route, which a shared helper cannot
 * express — each handler gets its own. The cast keeps the call sites terse.
 */
const context = (sessionId: string) =>
  ({ params: Promise.resolve({ sessionId }) }) as never

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("interview route handlers", () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /sessions", () => {
    it("forwards the chosen language, profile and application", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ sessionId: "s1" }))

      const response = await createSession(
        postRequest("/api/interviews/sessions", {
          applicationId: "app-1",
          language: "en",
          profile: "technical",
        })
      )

      expect(response.status).toBe(200)
      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions", {
        body: { applicationId: "app-1", language: "en", profile: "technical" },
        method: "POST",
      })
    })

    it("falls back to French and the standard profile on unknown values", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ sessionId: "s1" }))

      await createSession(
        postRequest("/api/interviews/sessions", {
          language: "de",
          profile: "chaotic",
        })
      )

      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions", {
        body: { applicationId: undefined, language: "fr", profile: "standard" },
        method: "POST",
      })
    })

    it("relays a 402 so the wizard can explain the empty balance", async () => {
      apiRequest.mockResolvedValue(
        jsonResponse({ message: "Credits insuffisants" }, 402)
      )

      const response = await createSession(
        postRequest("/api/interviews/sessions", { language: "fr" })
      )

      expect(response.status).toBe(402)
      await expect(response.json()).resolves.toEqual({
        message: "Credits insuffisants",
      })
    })

    it("rejects an unreadable body without calling the API", async () => {
      const response = await createSession(
        postRequest("/api/interviews/sessions", "not json")
      )

      expect(response.status).toBe(400)
      expect(apiRequest).not.toHaveBeenCalled()
    })
  })

  describe("GET /sessions/[sessionId]", () => {
    it("fetches the session for rehydration", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ id: "s1" }))

      const response = await getSession(
        new NextRequest("http://localhost/api/interviews/sessions/s1"),
        context("s1")
      )

      expect(response.status).toBe(200)
      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions/s1")
    })

    it("escapes the session id", async () => {
      apiRequest.mockResolvedValue(jsonResponse({}))

      await getSession(
        new NextRequest("http://localhost/api/interviews/sessions/x"),
        context("a/b")
      )

      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions/a%2Fb")
    })
  })

  describe("POST /sessions/[sessionId]/chunks", () => {
    it("forwards a complete segment", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ status: "recording" }))

      const response = await uploadChunk(
        postRequest("/api/interviews/sessions/s1/chunks", CHUNK),
        context("s1")
      )

      expect(response.status).toBe(200)
      expect(apiRequest).toHaveBeenCalledWith(
        "/interviews/sessions/s1/chunks",
        { body: CHUNK, method: "POST" }
      )
    })

    it("refuses an incomplete segment without calling the API", async () => {
      const response = await uploadChunk(
        postRequest("/api/interviews/sessions/s1/chunks", {
          ...CHUNK,
          sequence: "first",
        }),
        context("s1")
      )

      expect(response.status).toBe(400)
      expect(apiRequest).not.toHaveBeenCalled()
    })
  })

  describe("GET /sessions/[sessionId]/respond", () => {
    it("hands the upstream stream through without reading it", async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: {}\n\n"))
          controller.close()
        },
      })
      apiRequest.mockResolvedValue(
        new Response(body, { headers: { "content-type": "text/event-stream" } })
      )

      const response = await respond(
        new NextRequest("http://localhost/api/interviews/sessions/s1/respond"),
        context("s1")
      )

      // Same stream object: buffering it here would break sentence-by-sentence
      // speech, so the identity is the assertion that matters.
      expect(response.body).toBe(body)
      expect(response.headers.get("content-type")).toContain("text/event-stream")
      expect(response.headers.get("cache-control")).toContain("no-transform")
      expect(response.headers.get("x-accel-buffering")).toBe("no")
    })

    it("answers JSON when the interviewer cannot be reached", async () => {
      apiRequest.mockResolvedValue(new Response("nope", { status: 503 }))

      const response = await respond(
        new NextRequest("http://localhost/api/interviews/sessions/s1/respond"),
        context("s1")
      )

      expect(response.status).toBe(503)
      expect(response.headers.get("content-type")).toContain("application/json")
    })
  })

  describe("POST /sessions/[sessionId]/prefetch", () => {
    it("answers 204 even when warming fails", async () => {
      apiRequest.mockRejectedValue(new Error("upstream down"))

      const response = await prefetch(
        new NextRequest("http://localhost/api/interviews/sessions/s1/prefetch"),
        context("s1")
      )

      expect(response.status).toBe(204)
    })
  })
})
