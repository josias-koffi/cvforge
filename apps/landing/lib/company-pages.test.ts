import { afterEach, describe, expect, it, vi } from "vitest"

import sitemap from "@/app/sitemap"
import {
  companyPagePath,
  fetchCompanyPage,
  fetchCompanyPages,
  parseCompanyPageSegment,
} from "@/lib/company-pages"
import { localizedPath } from "@/lib/i18n"

const EVERIENCE = { name: "EVERIENCE", siren: "381983568" }

const env = (values: Record<string, string> = {}) =>
  values as unknown as NodeJS.ProcessEnv

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("companyPagePath", () => {
  it("names the company, SIREN last, under each language's slug", () => {
    expect(companyPagePath("fr", EVERIENCE)).toBe(
      "/fr/verifier-employeur/everience-381983568"
    )
    expect(companyPagePath("en", EVERIENCE)).toBe(
      "/en/employer-check/everience-381983568"
    )
  })

  it("writes accents and punctuation plainly, and keeps a nameless SIREN", () => {
    expect(
      companyPagePath("fr", {
        name: "CDC HABITAT SOCIAL SOCIÉTÉ D'HLM",
        siren: "470801168",
      })
    ).toBe("/fr/verifier-employeur/cdc-habitat-social-societe-d-hlm-470801168")
    expect(companyPagePath("fr", { name: "", siren: "470801168" })).toBe(
      "/fr/verifier-employeur/470801168"
    )
  })

  it("is switched to the other language by the language switcher", () => {
    expect(
      localizedPath("/fr/verifier-employeur/everience-381983568", "en")
    ).toBe("/en/employer-check/everience-381983568")
  })
})

describe("parseCompanyPageSegment", () => {
  it.each([
    ["everience-381983568", "381983568"],
    ["381983568", "381983568"],
    ["any-words-381983568", "381983568"],
  ])("reads %s", (segment, siren) => {
    expect(parseCompanyPageSegment(segment)).toBe(siren)
  })

  it.each([
    "everience",
    "everience-38198356",
    "everience-38198356800092",
    "x381983568",
  ])("refuses %s", (segment) => {
    expect(parseCompanyPageSegment(segment)).toBeNull()
  })
})

describe("fetching", () => {
  it("asks the API's page route with the SIREN, revalidated daily", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ siren: "381983568" })))

    await expect(
      fetchCompanyPage(
        "381983568",
        env({ API_INTERNAL_URL: "http://api/" }),
        fetcher
      )
    ).resolves.toEqual({ siren: "381983568" })
    expect(fetcher).toHaveBeenCalledWith(
      "http://api/public/company-pages/381983568",
      {
        next: { revalidate: 86_400 },
      }
    )
  })

  it("treats a 404 and an unreachable API alike: no page", async () => {
    const missing = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 404 }))
    const down = vi.fn().mockRejectedValue(new Error("down"))

    expect(await fetchCompanyPage("381983568", env(), missing)).toBeNull()
    expect(await fetchCompanyPage("381983568", env(), down)).toBeNull()
    expect(await fetchCompanyPages(env(), down)).toEqual([])
    expect(await fetchCompanyPages(env(), missing)).toEqual([])
  })
})

describe("sitemap and the company pages", () => {
  function stubApi(pages: { market: unknown[]; company: unknown[] }) {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string) =>
          new Response(
            JSON.stringify({
              pages: url.endsWith("/public/company-pages")
                ? pages.company
                : pages.market,
            })
          )
      )
    )
  }

  it("lists each company page in both languages, with alternates and its reading date", async () => {
    stubApi({
      company: [{ ...EVERIENCE, refreshedAt: "2026-09-20T08:00:00.000Z" }],
      market: [],
    })

    const entries = await sitemap()
    const fr = entries.find(({ url }) =>
      url.endsWith("/fr/verifier-employeur/everience-381983568")
    )

    expect(fr).toMatchObject({
      alternates: {
        languages: {
          en: expect.stringMatching(
            /\/en\/employer-check\/everience-381983568$/
          ),
        },
      },
      lastModified: "2026-09-20T08:00:00.000Z",
    })
    expect(
      entries.some(({ url }) =>
        url.endsWith("/en/employer-check/everience-381983568")
      )
    ).toBe(true)
  })

  it("lists no company page the API does not list", async () => {
    stubApi({ company: [], market: [] })

    const entries = await sitemap()

    expect(entries.some(({ url }) => /\/verifier-employeur\/./.test(url))).toBe(
      false
    )
    expect(entries.some(({ url }) => /\/employer-check\/./.test(url))).toBe(
      false
    )
  })
})
