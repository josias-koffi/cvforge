import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  InterviewRequestError,
  fetchSession,
  openOpeningStream,
  openTurnStream,
  startSession,
} from "@/lib/interview/client"

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

    const result = await startSession({ language: "fr", profile: "technical" })

    expect(result.sessionId).toBe("s1")
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/interviews/sessions")
    expect(JSON.parse(String(init.body))).toEqual({
      language: "fr",
      profile: "technical",
    })
  })

  it("explains an empty balance in the user's own terms", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 402 }))

    await expect(
      startSession({ language: "fr", profile: "standard" })
    ).rejects.toThrow(/Crédits insuffisants/)
  })

  it("prefers the server's message when there is one", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Candidature introuvable." }, 404)
    )

    await expect(
      startSession({ language: "fr", profile: "standard" })
    ).rejects.toThrow("Candidature introuvable.")
  })

  it("carries the status on the error, so callers can branch on it", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 402 }))

    await expect(
      startSession({ language: "fr", profile: "standard" })
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



  it("posts the answer and returns the spoken reply stream", async () => {
    const body = new ReadableStream<Uint8Array>()
    fetchMock.mockResolvedValue(new Response(body))
    const controller = new AbortController()

    await expect(
      openTurnStream("s1", CHUNK, controller.signal)
    ).resolves.toBe(body)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/interviews/sessions/s1/turn")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual(CHUNK)
    // Without it, an abandoned turn keeps generating server-side.
    expect(init.signal).toBe(controller.signal)
  })

  it("reports an interviewer that could not answer", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }))

    await expect(
      openTurnStream("s1", CHUNK, new AbortController().signal)
    ).rejects.toThrow("Le recruteur n'a pas pu répondre.")
  })

  it("opens the interview with no body: there is no answer yet", async () => {
    const body = new ReadableStream<Uint8Array>()
    fetchMock.mockResolvedValue(new Response(body))
    const controller = new AbortController()

    await expect(
      openOpeningStream("s1", controller.signal)
    ).resolves.toBe(body)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/interviews/sessions/s1/opening")
    expect(init.method).toBe("POST")
    expect(init.body).toBeUndefined()
    expect(init.signal).toBe(controller.signal)
  })

  it("reports a recruiter that could not open the interview", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }))

    await expect(
      openOpeningStream("s1", new AbortController().signal)
    ).rejects.toThrow("Le recruteur n'a pas pu répondre.")
  })

})
