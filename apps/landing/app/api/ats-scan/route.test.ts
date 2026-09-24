import { afterEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"

function makeRequest(body: FormData, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3101/api/ats-scan", {
    body,
    headers,
    method: "POST",
  })
}

function makeForm() {
  const form = new FormData()

  form.append("cvFile", new File(["%PDF-1.4"], "cv.pdf"))

  return form
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("POST /api/ats-scan", () => {
  it("relays the API's answer on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ overallScore: 72, scanId: "abc" }), {
        status: 200,
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(makeRequest(makeForm()))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ overallScore: 72, scanId: "abc" })
  })

  /** 429 and 503 mean different things to the page; neither may become a 500. */
  it.each([400, 413, 422, 429, 503])(
    "passes status %i through with the API's code, never its message",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              code: "RATE_LIMITED",
              message: "Trop d'analyses.",
            }),
            { status }
          )
        )
      )

      const response = await POST(makeRequest(makeForm()))

      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ code: "RATE_LIMITED" })
    }
  )

  it("survives an error body that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("<html>502</html>", { status: 502 }))
    )

    const response = await POST(makeRequest(makeForm()))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ code: null })
  })

  it("answers 502 when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))

    const response = await POST(makeRequest(makeForm()))

    expect(response.status).toBe(502)
  })

  /** Refused before the bytes are carried across the network. */
  it("refuses an oversized upload without calling the API", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      makeRequest(makeForm(), { "content-length": String(6 * 1024 * 1024) })
    )

    expect(response.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refuses a body that is not a form", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(
      new Request("http://localhost:3101/api/ats-scan", {
        body: "not a form",
        headers: { "content-type": "text/plain" },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("forwards the caller's address to the API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await POST(makeRequest(makeForm(), { "x-forwarded-for": "203.0.113.7" }))

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(init.headers).toMatchObject({ "x-forwarded-for": "203.0.113.7" })
  })
})
