import { afterEach, describe, expect, it, vi } from "vitest"

import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { scanErrorMessage } from "@/lib/ats-client"
import {
  fetchCompany,
  postCompanyCheckLead,
  searchCompanies,
} from "@/lib/company-check-client"

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

describe("company check client", () => {
  it("searches through the landing's own route", async () => {
    const fetchMock = stub({ matches: [] })

    await expect(searchCompanies("Café & Co")).resolves.toEqual({ matches: [] })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/company-check?q=Caf%C3%A9+%26+Co"
    )
  })

  it("reads one company by its SIREN", async () => {
    const fetchMock = stub({ status: "unknown" })

    await expect(fetchCompany("381983568")).resolves.toEqual({
      status: "unknown",
    })
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/company-check/381983568")
  })

  it("posts the lead with the SIREN checked", async () => {
    const fetchMock = stub({ magicLinkSent: true }, 202)

    await postCompanyCheckLead("a@b.fr", true, "381983568")

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/company-check/lead")
    expect(JSON.parse(init.body)).toEqual({
      consentAccepted: true,
      email: "a@b.fr",
      siren: "381983568",
    })
  })

  it.each([
    ["COMPANY_QUERY_INVALID", "companyQueryInvalid"],
    ["COMPANY_SOURCE_UNAVAILABLE", "companySourceUnavailable"],
  ] as const)("words %s in the page's language", async (code, key) => {
    stub({ code }, code === "COMPANY_QUERY_INVALID" ? 400 : 503)

    const error = await searchCompanies("ab").catch((caught) => caught)

    expect(scanErrorMessage(error, fr.ats)).toBe(fr.ats.errors[key])
    expect(scanErrorMessage(error, en.ats)).toBe(en.ats.errors[key])
  })
})
