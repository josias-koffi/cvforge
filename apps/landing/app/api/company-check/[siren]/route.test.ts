import { afterEach, describe, expect, it, vi } from "vitest"

import { companyCheckEndpoint } from "@/lib/ats-api"

import { GET } from "./route"

function read(siren: string) {
  return GET(
    new Request(`http://localhost:3101/api/company-check/${siren}?extra=1`, {
      headers: { "x-forwarded-for": "203.0.113.7" },
    }),
    { params: Promise.resolve({ siren }) }
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GET /api/company-check/[siren]", () => {
  it("relays a SIREN, alone, with the visitor's address", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"status":"unknown"}', { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await read("381983568")

    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${companyCheckEndpoint()}/381983568`)
    expect(init.headers).toMatchObject({ "x-forwarded-for": "203.0.113.7" })
  })

  it.each(["38198356", "..%2Fadmin", "abcdefghi"])(
    "refuses %s without calling the API",
    async (siren) => {
      const fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)

      expect((await read(siren)).status).toBe(400)
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )
})
