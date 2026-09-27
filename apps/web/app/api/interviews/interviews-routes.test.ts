import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Hoisted: `vi.mock` is lifted above the imports, so the double has to be too.
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock("@/lib/api", () => ({ apiRequest }))

import { POST as createSession } from "./sessions/route"
import { GET as getSession } from "./sessions/[sessionId]/route"
import { POST as realtime } from "./sessions/[sessionId]/realtime/route"
import { POST as pause } from "./sessions/[sessionId]/pause/route"

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

  describe("POST /sessions/[sessionId]/pause", () => {
    it("forwards the pause and returns when the clock stopped", async () => {
      apiRequest.mockResolvedValue(
        jsonResponse({ pausedAt: "2026-09-25T10:04:00.000Z" })
      )

      const response = await pause(
        new NextRequest("http://localhost/api/interviews/sessions/s1/pause", {
          method: "POST",
        }),
        context("s1")
      )

      expect(await response.json()).toEqual({ pausedAt: "2026-09-25T10:04:00.000Z" })
      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions/s1/pause", {
        method: "POST",
      })
    })
  })

  describe("POST /sessions/[sessionId]/realtime", () => {
    it("forwards the WebRTC offer and returns the answer", async () => {
      apiRequest.mockResolvedValue(
        jsonResponse({ sdp: "v=0 answer", startedAt: "2026-09-25T10:00:00.000Z" })
      )

      const response = await realtime(
        postRequest("/api/interviews/sessions/s1/realtime", { sdp: "v=0 offer" }),
        context("s1")
      )

      expect(await response.json()).toEqual({
        sdp: "v=0 answer",
        startedAt: "2026-09-25T10:00:00.000Z",
      })
      expect(apiRequest).toHaveBeenCalledWith("/interviews/sessions/s1/realtime", {
        body: { sdp: "v=0 offer" },
        method: "POST",
      })
    })

    it("refuses a missing offer without calling the API", async () => {
      const response = await realtime(
        postRequest("/api/interviews/sessions/s1/realtime", { sdp: 42 }),
        context("s1")
      )

      expect(response.status).toBe(400)
      expect(apiRequest).not.toHaveBeenCalled()
    })

    it("passes the API's own refusal through, message included", async () => {
      apiRequest.mockResolvedValue(
        jsonResponse({ message: "Le temps de cet entretien est écoulé." }, 400)
      )

      const response = await realtime(
        postRequest("/api/interviews/sessions/s1/realtime", { sdp: "v=0" }),
        context("s1")
      )

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        message: "Le temps de cet entretien est écoulé.",
      })
    })
  })
})
