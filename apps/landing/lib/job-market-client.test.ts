import { afterEach, describe, expect, it, vi } from "vitest"

import { fr } from "@/content/fr"
import { scanErrorMessage } from "@/lib/ats-client"
import {
  fetchAppellations,
  fetchJobMarket,
  postJobMarketLead,
} from "@/lib/job-market-client"

afterEach(() => {
  vi.unstubAllGlobals()
})

function stub(body: unknown, status = 200) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

describe("job market client", () => {
  it("asks the landing's own route for suggestions", async () => {
    const fetchMock = stub({ appellations: [{ code: "1" }] })

    await expect(fetchAppellations("dév web")).resolves.toEqual([{ code: "1" }])
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/job-market/appellations?q=d%C3%A9v+web"
    )
  })

  it("reads one job in one department", async () => {
    const fetchMock = stub({ status: "collecting" })

    await expect(fetchJobMarket("38874", "2A")).resolves.toEqual({
      status: "collecting",
    })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/job-market?appellation=38874&department=2A"
    )
  })

  it("posts the lead with the job and the department", async () => {
    const fetchMock = stub({ magicLinkSent: true }, 202)

    await postJobMarketLead("a@b.fr", true, "38874", "44")

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/job-market/lead")
    expect(JSON.parse(init.body)).toEqual({
      appellation: "38874",
      consentAccepted: true,
      department: "44",
      email: "a@b.fr",
    })
  })

  it("words the tool's own refusals", async () => {
    stub({ code: "ROME_APPELLATION_UNKNOWN" }, 400)

    const error = await fetchJobMarket("1", "44").catch((caught) => caught)

    expect(scanErrorMessage(error, fr.ats)).toBe(
      fr.ats.errors.appellationUnknown
    )
  })
})
