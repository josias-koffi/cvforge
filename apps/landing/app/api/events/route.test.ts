import { afterEach, describe, expect, it, vi } from "vitest"

import { POST, eventsEndpoint } from "./route"

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3101/api/events", {
    body,
    headers,
    method: "POST",
  })
}

const EVENT = JSON.stringify({ locale: "fr", step: "view", tool: "ats" })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("POST /api/events", () => {
  it("relays the event with the visitor's address", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      makeRequest(EVENT, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
    )

    expect(response.status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(eventsEndpoint())
    expect(init.body).toBe(EVENT)
    expect(init.headers).toMatchObject({ "x-forwarded-for": "203.0.113.7" })
  })

  it("passes the API's refusal through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 400 }))
    )

    expect((await POST(makeRequest(EVENT))).status).toBe(400)
  })

  it.each([
    ["an empty body", ""],
    ["an oversized body", "x".repeat(600)],
  ])("refuses %s without calling the API", async (_label, body) => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    expect((await POST(makeRequest(body))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("answers 502 when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")))

    expect((await POST(makeRequest(EVENT))).status).toBe(502)
  })
})

describe("eventsEndpoint", () => {
  it("targets the API's public events route", () => {
    expect(
      eventsEndpoint({ API_INTERNAL_URL: "http://api:3000/" } as never)
    ).toBe("http://api:3000/public/events")
  })
})
