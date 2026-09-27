import { afterEach, describe, expect, it, vi } from "vitest"

import { GET as suggest } from "./appellations/route"
import { POST as lead } from "./lead/route"
import { GET as read } from "./route"

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubApi(body: unknown, status = 200) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

describe("GET /api/job-market", () => {
  it("relays the job and the department only, with the visitor's address", async () => {
    const fetchMock = stubApi({ status: "ready" })

    const response = await read(
      new Request(
        "http://localhost/api/job-market?appellation=38874&department=44&debug=1",
        { headers: { "x-forwarded-for": "203.0.113.9" } }
      )
    )

    expect(await response.json()).toEqual({ status: "ready" })
    const [url, init] = fetchMock.mock.calls[0]!
    const relayed = new URL(url)
    expect(relayed.pathname).toMatch(/\/public\/job-market$/)
    expect(Object.fromEntries(relayed.searchParams)).toEqual({
      appellation: "38874",
      department: "44",
    })
    expect(init.method).toBe("GET")
    expect(init.headers).toMatchObject({ "x-forwarded-for": "203.0.113.9" })
  })

  it("passes a refusal through as its code, never the API's message", async () => {
    stubApi({ code: "DEPARTMENT_UNKNOWN", message: "Choisissez…" }, 400)

    const response = await read(
      new Request("http://localhost/api/job-market?appellation=1&department=0")
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ code: "DEPARTMENT_UNKNOWN" })
  })

  it("answers 502 when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")))

    const response = await read(new Request("http://localhost/api/job-market"))

    expect(response.status).toBe(502)
  })
})

describe("GET /api/job-market/appellations", () => {
  it("relays the query to the API's autocomplete", async () => {
    const fetchMock = stubApi({ appellations: [] })

    await suggest(
      new Request("http://localhost/api/job-market/appellations?q=d%C3%A9v")
    )

    const relayed = new URL(fetchMock.mock.calls[0]![0])
    expect(relayed.pathname).toMatch(/\/public\/job-market\/appellations$/)
    expect(relayed.searchParams.get("q")).toBe("dév")
  })
})

describe("POST /api/job-market/lead", () => {
  it("relays the email, the consent, the job and the place as JSON", async () => {
    const fetchMock = stubApi({ magicLinkSent: true }, 202)
    const body = {
      appellation: "38874",
      consentAccepted: true,
      department: "44",
      email: "a@b.fr",
    }

    const response = await lead(
      new Request("http://localhost/api/job-market/lead", {
        body: JSON.stringify(body),
        method: "POST",
      })
    )

    expect(response.status).toBe(202)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/public\/job-market\/lead$/)
    expect(JSON.parse(init.body)).toEqual(body)
  })
})
