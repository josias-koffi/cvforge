import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  InterviewRequestError,
  fetchSession,
  openRealtimeCall,
  pauseSession,
  startSession,
} from "@/lib/interview/client"

const fetchMock = vi.fn()

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("interview client", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("posts the session options and returns the created session", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ sessionId: "s1", session: {} }))

    const result = await startSession({
      durationMinutes: 20,
      language: "fr",
      profile: "technical",
    })

    expect(result.sessionId).toBe("s1")
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/interviews/sessions")
    expect(JSON.parse(String(init.body))).toEqual({
      durationMinutes: 20,
      language: "fr",
      profile: "technical",
    })
  })

  it("explains an empty balance in the user's own terms", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 402 }))

    await expect(
      startSession({ durationMinutes: 10, language: "fr", profile: "standard" })
    ).rejects.toThrow(/Crédits insuffisants/)
  })

  it("prefers the server's message when there is one", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Candidature introuvable." }, 404)
    )

    await expect(
      startSession({ durationMinutes: 10, language: "fr", profile: "standard" })
    ).rejects.toThrow("Candidature introuvable.")
  })

  it("carries the status on the error, so callers can branch on it", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 402 }))

    await expect(
      startSession({ durationMinutes: 10, language: "fr", profile: "standard" })
    ).rejects.toMatchObject({ status: 402 })
  })

  it("fetches a session for rehydration", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "s1" }))

    await expect(fetchSession("s1")).resolves.toEqual({ id: "s1" })
    expect(fetchMock).toHaveBeenCalledWith("/api/interviews/sessions/s1")
  })

  it("reports an unknown session", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }))

    await expect(fetchSession("nope")).rejects.toBeInstanceOf(
      InterviewRequestError
    )
  })



  it("posts the WebRTC offer and returns the recruiter's answer", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ sdp: "v=0 answer", startedAt: "2026-09-25T10:00:00.000Z" })
    )

    const result = await openRealtimeCall("s1", "v=0 offer")

    expect(result.sdp).toBe("v=0 answer")
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/interviews/sessions/s1/realtime")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ sdp: "v=0 offer" })
  })

  it("pauses the session on the server", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ pausedAt: "2026-09-25T10:04:00.000Z" }))

    await expect(pauseSession("s1")).resolves.toEqual({
      pausedAt: "2026-09-25T10:04:00.000Z",
    })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/interviews/sessions/s1/pause")
    expect(init.method).toBe("POST")
  })

  it("reports a recruiter that could not be reached", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Le temps de cet entretien est écoulé." }, 400)
    )

    await expect(openRealtimeCall("s1", "v=0")).rejects.toThrow(
      "Le temps de cet entretien est écoulé."
    )
  })
})
