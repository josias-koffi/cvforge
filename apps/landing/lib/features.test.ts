import { existsSync } from "node:fs"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import sitemap from "@/app/sitemap"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { featurePages } from "@/lib/features"
import { featureSlugs, localizedPath, locales } from "@/lib/i18n"
import { featurePageStructuredData } from "@/lib/structured-data"
import { freeTools } from "@/lib/tools"
import nextConfig, { featureRedirects } from "../next.config"

const APP_DIR = path.join(__dirname, "../app/[locale]")
const SCREENSHOTS = path.join(__dirname, "../public/screenshots")

/** The feature pages (US-142): a registry entry is a page that works. */
describe("featurePages", () => {
  it("lists only pages whose route and share card exist", () => {
    for (const feature of featurePages) {
      const folder = feature.path("en").split("/").pop()!

      expect(existsSync(path.join(APP_DIR, folder, "page.tsx"))).toBe(true)
      expect(existsSync(path.join(APP_DIR, folder, "opengraph-image.tsx"))).toBe(
        true
      )
    }
  })

  it("has a capture on disk, in both themes, for every block and hero", () => {
    for (const feature of featurePages) {
      for (const name of [feature.hero.name, ...feature.blocks]) {
        for (const theme of ["light", "dark"]) {
          expect(
            existsSync(path.join(SCREENSHOTS, theme, `${name}.webp`)),
            `${theme}/${name}`
          ).toBe(true)
        }
      }
    }
  })

  it("gives each block of the copy its capture, in both languages", () => {
    for (const feature of featurePages) {
      expect(fr.featurePages.pages[feature.key].blocks).toHaveLength(
        feature.blocks.length
      )
      expect(en.featurePages.pages[feature.key].blocks).toHaveLength(
        feature.blocks.length
      )
    }
  })

  it("points only to free tools that are live", () => {
    const live = freeTools.map(({ key }) => key)

    for (const feature of featurePages) {
      for (const tool of feature.tools) {
        expect(live).toContain(tool)
      }
    }
  })

  it("is translated by the language switcher", () => {
    for (const feature of featurePages) {
      expect(localizedPath(feature.path("fr"), "en")).toBe(feature.path("en"))
      expect(localizedPath(feature.path("en"), "fr")).toBe(feature.path("fr"))
    }
  })
})

/** next.config cannot import lib/i18n: the two lists are checked to agree. */
describe("the feature pages in next.config", () => {
  it("redirects each language away from the other's slug", () => {
    const redirects = featureRedirects()

    for (const slugs of Object.values(featureSlugs)) {
      expect(redirects).toContainEqual({
        source: `/fr/${slugs.en}`,
        destination: `/fr/${slugs.fr}`,
        permanent: true,
      })
      expect(redirects).toContainEqual({
        source: `/en/${slugs.fr}`,
        destination: `/en/${slugs.en}`,
        permanent: true,
      })
    }
    expect(redirects).toHaveLength(Object.keys(featureSlugs).length * 2)
  })

  it("rewrites the French address, and its share card, onto the route", async () => {
    const rewrites = await nextConfig.rewrites!()

    for (const slugs of Object.values(featureSlugs)) {
      expect(rewrites).toContainEqual({
        source: `/fr/${slugs.fr}`,
        destination: `/fr/${slugs.en}`,
      })
      expect(rewrites).toContainEqual({
        source: `/fr/${slugs.fr}/:path+`,
        destination: `/fr/${slugs.en}/:path+`,
      })
    }
  })
})

describe("sitemap and the feature pages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("declares every feature page in both languages, just under home", async () => {
    const entries = await sitemap()

    for (const feature of featurePages) {
      for (const locale of locales) {
        const entry = entries.find(({ url }) =>
          url.endsWith(feature.path(locale))
        )

        expect(entry?.priority).toBe(0.9)
      }
    }
  })
})

describe("featurePageStructuredData", () => {
  it("announces the page's own FAQ and where it sits", () => {
    const page = fr.featurePages.pages.daily_offers
    const graph = featurePageStructuredData({
      base: "https://cvspark.test",
      locale: "fr",
      page,
      crumbs: [
        { name: "CVSpark", path: "/fr" },
        { name: page.card.name, path: "/fr/offres-du-jour" },
      ],
    })["@graph"]

    expect(graph[0]).toMatchObject({ "@type": "BreadcrumbList" })
    expect(graph[1]).toMatchObject({
      "@type": "WebPage",
      url: "https://cvspark.test/fr/offres-du-jour",
    })
    expect(graph[2]).toMatchObject({ "@type": "FAQPage" })
    expect((graph[2] as { mainEntity: unknown[] }).mainEntity).toHaveLength(
      page.faq.items.length
    )
  })
})
