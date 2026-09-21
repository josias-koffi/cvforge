import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  InterviewRequestError,
  fetchSession,
  openResponseStream,
  startSession,
  triggerPrefetch,
  uploadChunk,
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

  it("uploads a segment and returns the updated session", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "recording" }))

    await expect(uploadChunk("s1", CHUNK)).resolves.toEqual({
      status: "recording",
    })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe("/api/interviews/sessions/s1/chunks")
  })

  it("reports a failed transcription", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }))

    await expect(uploadChunk("s1", CHUNK)).rejects.toThrow(
      "La transcription a échoué."
    )
  })

  it("returns the reply stream and passes the abort signal on", async () => {
    const body = new ReadableStream<Uint8Array>()
    fetchMock.mockResolvedValue(new Response(body))
    const controller = new AbortController()

    await expect(openResponseStream("s1", controller.signal)).resolves.toBe(body)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // Without it, an abandoned turn keeps generating server-side.
    expect(init.signal).toBe(controller.signal)
  })

  it("reports an interviewer that could not answer", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }))

    await expect(
      openResponseStream("s1", new AbortController().signal)
    ).rejects.toThrow("Le recruteur n'a pas pu répondre.")
  })

  it("warms the next question without waiting, and swallows a failure", async () => {
    fetchMock.mockRejectedValue(new Error("offline"))

    expect(() => triggerPrefetch("s1")).not.toThrow()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/interviews/sessions/s1/prefetch",
      { method: "POST" }
    )
  })
})
