import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Hoisted: `vi.mock` is lifted above the imports, so the double has to be too.
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock("@/lib/api", () => ({ apiRequest }))

import { POST as createSession } from "./sessions/route"
import { GET as getSession } from "./sessions/[sessionId]/route"
import { POST as turn } from "./sessions/[sessionId]/turn/route"
import { POST as opening } from "./sessions/[sessionId]/opening/route"
import { POST as turnChunk } from "./sessions/[sessionId]/turn/chunk/route"

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
    it("forwards the chosen language, profile, application and duration", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ sessionId: "s1" }))

      const response = await createSession(
        postRequest("/api/interviews/sessions", {
          applicationId: "app-1",
          durationMinutes: 30,
          language: "en",
          profile: "technical",
        })
      )

      expect(response.status).toBe(200)
      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions", {
        body: {
          applicationId: "app-1",
          durationMinutes: 30,
          language: "en",
          profile: "technical",
        },
        method: "POST",
      })
    })

    it("falls back to French, the standard profile and ten minutes", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ sessionId: "s1" }))

      await createSession(
        postRequest("/api/interviews/sessions", {
          durationMinutes: 45,
          language: "de",
          profile: "chaotic",
        })
      )

      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions", {
        body: {
          applicationId: undefined,
          durationMinutes: 10,
          language: "fr",
          profile: "standard",
        },
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

  describe("POST /sessions/[sessionId]/turn", () => {
    it("forwards a complete segment", async () => {
      apiRequest.mockResolvedValue(
        new Response(new ReadableStream<Uint8Array>(), {
          headers: { "content-type": "text/event-stream" },
        })
      )

      const response = await turn(
        postRequest("/api/interviews/sessions/s1/turn", CHUNK),
        context("s1")
      )

      expect(response.status).toBe(200)
      expect(apiRequest).toHaveBeenCalledWith(
        "/interviews/sessions/s1/turn",
        expect.objectContaining({ body: CHUNK, method: "POST" })
      )
    })

    it("refuses an incomplete segment without calling the API", async () => {
      const response = await turn(
        postRequest("/api/interviews/sessions/s1/turn", {
          ...CHUNK,
          sequence: "first",
        }),
        context("s1")
      )

      expect(response.status).toBe(400)
      expect(apiRequest).not.toHaveBeenCalled()
    })

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

      const response = await turn(
        postRequest("/api/interviews/sessions/s1/turn", CHUNK),
        context("s1")
      )

      // Same stream object: reading it here would hold the whole reply back
      // and the voice would arrive in one lump, so the identity is the
      // assertion that matters.
      expect(response.body).toBe(body)
      expect(response.headers.get("content-type")).toContain("text/event-stream")
      expect(response.headers.get("cache-control")).toContain("no-transform")
      expect(response.headers.get("x-accel-buffering")).toBe("no")
    })

    it("answers JSON when the interviewer cannot be reached", async () => {
      apiRequest.mockResolvedValue(new Response("nope", { status: 503 }))

      const response = await turn(
        postRequest("/api/interviews/sessions/s1/turn", CHUNK),
        context("s1")
      )

      expect(response.status).toBe(503)
      expect(response.headers.get("content-type")).toContain("application/json")
    })
  })

  describe("POST /sessions/[sessionId]/turn/chunk", () => {
    const PART = { audioBase64: "AAAA", chunkId: "c1", part: 0 }

    it("forwards one piece of an answer and returns the count", async () => {
      apiRequest.mockResolvedValue(jsonResponse({ parts: 4 }))

      const response = await turnChunk(
        postRequest("/api/interviews/sessions/s1/turn/chunk", PART),
        context("s1")
      )

      expect(await response.json()).toEqual({ parts: 4 })
      expect(apiRequest).toHaveBeenCalledWith(
        "/interviews/sessions/s1/turn/chunk",
        expect.objectContaining({ body: PART, method: "POST" })
      )
    })

    it("refuses an incomplete piece without calling the API", async () => {
      const response = await turnChunk(
        postRequest("/api/interviews/sessions/s1/turn/chunk", {
          ...PART,
          part: "first",
        }),
        context("s1")
      )

      expect(response.status).toBe(400)
      expect(apiRequest).not.toHaveBeenCalled()
    })

    it("passes the API's own refusal through", async () => {
      // A piece past the ceiling has to reach the studio as such, so it can
      // fall back to sending the answer whole.
      apiRequest.mockResolvedValue(jsonResponse({ message: "trop long" }, 413))

      const response = await turnChunk(
        postRequest("/api/interviews/sessions/s1/turn/chunk", PART),
        context("s1")
      )

      expect(response.status).toBe(413)
    })
  })

  describe("POST /sessions/[sessionId]/opening", () => {
    it("streams the greeting with no body of its own", async () => {
      const body = new ReadableStream<Uint8Array>()
      apiRequest.mockResolvedValue(
        new Response(body, { headers: { "content-type": "text/event-stream" } })
      )

      const response = await opening(
        new NextRequest("http://localhost/api/interviews/sessions/s1/opening", {
          method: "POST",
        }),
        context("s1")
      )

      expect(response.body).toBe(body)
      expect(apiRequest).toHaveBeenCalledWith(
        "/interviews/sessions/s1/opening",
        expect.objectContaining({ method: "POST" })
      )
    })
  })
})
