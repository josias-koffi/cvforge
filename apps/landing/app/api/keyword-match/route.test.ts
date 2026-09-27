import { afterEach, describe, expect, it, vi } from "vitest"

import { POST as lead } from "./lead/route"
import { POST as match } from "./route"

afterEach(() => {
  vi.unstubAllGlobals()
})

function form() {
  const body = new FormData()

  body.append("cvFile", new File(["%PDF-1.4"], "cv.pdf"))
  body.append("offerText", "Une offre")

  return body
}

describe("POST /api/keyword-match", () => {
  it("relays the upload to the API's comparator, with the visitor's address", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ coverage: 50 })))
    vi.stubGlobal("fetch", fetchMock)

    const response = await match(
      new Request("http://localhost/api/keyword-match", {
        body: form(),
        headers: { "x-forwarded-for": "203.0.113.9" },
        method: "POST",
      })
    )

    expect(await response.json()).toEqual({ coverage: 50 })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/public\/keyword-match$/)
    expect(init.headers).toMatchObject({ "x-forwarded-for": "203.0.113.9" })
  })

  it("passes a refusal through as its code, never the API's message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ code: "OFFER_TEXT_REQUIRED", message: "Collez…" }),
            { status: 400 }
          )
        )
    )

    const response = await match(
      new Request("http://localhost/api/keyword-match", {
        body: form(),
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: "OFFER_TEXT_REQUIRED" })
  })

  it("answers 502 when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")))

    const response = await match(
      new Request("http://localhost/api/keyword-match", {
        body: form(),
        method: "POST",
      })
    )

    expect(response.status).toBe(502)
  })
})

describe("POST /api/keyword-match/lead", () => {
  it("relays the JSON body and the API's 202", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ magicLinkSent: true }), { status: 202 })
      )
    vi.stubGlobal("fetch", fetchMock)

    const response = await lead(
      new Request("http://localhost/api/keyword-match/lead", {
        body: JSON.stringify({ email: "a@b.fr" }),
        method: "POST",
      })
    )

    expect(response.status).toBe(202)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/public\/keyword-match\/lead$/)
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.fr" })
  })

  it("refuses a body that is not JSON without calling the API", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await lead(
      new Request("http://localhost/api/keyword-match/lead", {
        body: "not json",
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
