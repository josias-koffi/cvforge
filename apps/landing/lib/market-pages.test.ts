import { afterEach, describe, expect, it, vi } from "vitest"

import sitemap from "@/app/sitemap"
import { localizedPath } from "@/lib/i18n"
import {
  fetchMarketPage,
  fetchMarketPages,
  marketPagePath,
  parseMarketPageSegments,
  slugify,
} from "@/lib/market-pages"

const COMPTABLE_44 = {
  department: "44",
  departmentLabel: "Loire-Atlantique",
  romeCode: "M1203",
  romeLabel: "Comptable",
}

const env = (values: Record<string, string> = {}) =>
  values as unknown as NodeJS.ProcessEnv

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("marketPagePath", () => {
  it("names the job and the department, codes last, under each language's slug", () => {
    expect(marketPagePath("fr", COMPTABLE_44)).toBe(
      "/fr/metier-recrute/comptable-m1203/loire-atlantique-44"
    )
    expect(marketPagePath("en", COMPTABLE_44)).toBe(
      "/en/job-market/comptable-m1203/loire-atlantique-44"
    )
  })

  it("writes accents, slashes and Corsica plainly", () => {
    expect(
      marketPagePath("fr", {
        department: "2A",
        departmentLabel: "Corse-du-Sud",
        romeCode: "M1855",
        romeLabel: "Développeur / Développeuse web",
      })
    ).toBe("/fr/metier-recrute/developpeur-developpeuse-web-m1855/corse-du-sud-2a")
    expect(slugify("  Val-d'Oise ")).toBe("val-d-oise")
  })

  it("is switched to the other language by the language switcher", () => {
    expect(
      localizedPath("/fr/metier-recrute/comptable-m1203/loire-atlantique-44", "en")
    ).toBe("/en/job-market/comptable-m1203/loire-atlantique-44")
  })
})

describe("parseMarketPageSegments", () => {
  it.each([
    ["comptable-m1203", "loire-atlantique-44", { department: "44", romeCode: "M1203" }],
    ["m1203", "2b", { department: "2B", romeCode: "M1203" }],
    ["anything-M1203", "la-reunion-974", { department: "974", romeCode: "M1203" }],
  ])("reads %s / %s", (job, department, expected) => {
    expect(parseMarketPageSegments(job, department)).toEqual(expected)
  })

  it.each([
    ["comptable", "loire-atlantique-44"],
    ["comptable-z1203", "44"],
    ["comptable-m1203", "loire-atlantique"],
    ["comptable-m12034", "44"],
  ])("refuses %s / %s", (job, department) => {
    expect(parseMarketPageSegments(job, department)).toBeNull()
  })
})

describe("fetching", () => {
  it("asks the API's page route with the codes, revalidated daily", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ romeCode: "M1203" })))

    await expect(
      fetchMarketPage("M1203", "2A", env({ API_INTERNAL_URL: "http://api" }), fetcher)
    ).resolves.toEqual({ romeCode: "M1203" })
    expect(fetcher).toHaveBeenCalledWith(
      "http://api/public/market-pages/M1203/2A",
      { next: { revalidate: 86_400 } }
    )
  })

  it("treats a 404 and an unreachable API alike: no page", async () => {
    const missing = vi.fn().mockResolvedValue(new Response("{}", { status: 404 }))
    const down = vi.fn().mockRejectedValue(new Error("down"))

    expect(await fetchMarketPage("M1203", "53", env(), missing)).toBeNull()
    expect(await fetchMarketPage("M1203", "53", env(), down)).toBeNull()
    expect(await fetchMarketPages(env(), down)).toEqual([])
  })
})

describe("sitemap and the job × department pages", () => {
  it("lists each page in both languages, with alternates and its reading date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            pages: [{ ...COMPTABLE_44, refreshedAt: "2026-09-20T08:00:00.000Z" }],
          })
        )
      )
    )

    const entries = await sitemap()
    const fr = entries.find(({ url }) =>
      url.endsWith("/fr/metier-recrute/comptable-m1203/loire-atlantique-44")
    )

    expect(fr).toMatchObject({
      alternates: {
        languages: {
          en: expect.stringMatching(/\/en\/job-market\/comptable-m1203\/loire-atlantique-44$/),
        },
      },
      lastModified: "2026-09-20T08:00:00.000Z",
    })
    expect(
      entries.some(({ url }) =>
        url.endsWith("/en/job-market/comptable-m1203/loire-atlantique-44")
      )
    ).toBe(true)
  })
})
