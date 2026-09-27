import { afterEach, describe, expect, it, vi } from "vitest"

import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { scanErrorMessage } from "@/lib/ats-client"
import {
  postKeywordMatch,
  postKeywordMatchLead,
} from "@/lib/keyword-match-client"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("postKeywordMatch", () => {
  it("posts the CV and the offer to the landing's own route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ coverage: 40 })))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      postKeywordMatch(new File(["%PDF-"], "cv.pdf"), "Une offre")
    ).resolves.toEqual({ coverage: 40 })

    const [url, init] = fetchMock.mock.calls[0]!
    const body = init.body as FormData

    expect(url).toBe("/api/keyword-match")
    expect(body.get("offerText")).toBe("Une offre")
    expect(body.get("cvFile")).toBeInstanceOf(File)
  })

  it("throws the code the API refused with", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "OFFER_NOT_USABLE" }), {
          status: 422,
        })
      )
    )

    await expect(
      postKeywordMatch(new File(["%PDF-"], "cv.pdf"), "x")
    ).rejects.toEqual({ code: "OFFER_NOT_USABLE", status: 422 })
  })
})

describe("postKeywordMatchLead", () => {
  it("sends the email, the consent and the offer as JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ magicLinkSent: true }), { status: 202 })
      )
    vi.stubGlobal("fetch", fetchMock)

    await postKeywordMatchLead("a@b.fr", true, "Une offre")

    const [url, init] = fetchMock.mock.calls[0]!

    expect(url).toBe("/api/keyword-match/lead")
    expect(JSON.parse(init.body as string)).toEqual({
      consentAccepted: true,
      email: "a@b.fr",
      offerText: "Une offre",
    })
  })
})

/** The comparator's refusals are worded in the page's language (US-134). */
describe("the comparator's refusals", () => {
  it.each([
    ["OFFER_TEXT_REQUIRED", "offerRequired"],
    ["OFFER_NOT_USABLE", "offerNotUsable"],
  ] as const)("words %s in each language", (code, key) => {
    expect(scanErrorMessage({ code, status: 400 }, fr.ats)).toBe(
      fr.ats.errors[key]
    )
    expect(scanErrorMessage({ code, status: 400 }, en.ats)).toBe(
      en.ats.errors[key]
    )
  })
})
