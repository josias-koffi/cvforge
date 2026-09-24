import { existsSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { localizedPath, locales } from "@/lib/i18n"
import {
  freeTools,
  jobMarketPath,
  keywordMatchPath,
  toolsPath,
} from "@/lib/tools"

describe("toolsPath", () => {
  it("gives each language its own address", () => {
    expect(toolsPath("fr")).toBe("/fr/outils")
    expect(toolsPath("en")).toBe("/en/tools")
  })

  it("is translated by the language switcher", () => {
    expect(localizedPath("/fr/outils", "en")).toBe("/en/tools")
    expect(localizedPath("/en/tools", "fr")).toBe("/fr/outils")
  })
})

/**
 * A tool enters the list the day its page ships. Checked against the route
 * folders, so a card can never lead to a 404 (US-135).
 */
describe("keywordMatchPath", () => {
  it("gives the comparator an address per language, both switchable", () => {
    expect(keywordMatchPath("fr")).toBe("/fr/comparateur-cv-offre")
    expect(keywordMatchPath("en")).toBe("/en/cv-job-match")
    expect(localizedPath("/fr/comparateur-cv-offre", "en")).toBe(
      "/en/cv-job-match"
    )
  })
})

describe("jobMarketPath", () => {
  it("gives the job market tool an address per language, both switchable", () => {
    expect(jobMarketPath("fr")).toBe("/fr/metier-recrute")
    expect(jobMarketPath("en")).toBe("/en/job-market")
    expect(localizedPath("/fr/metier-recrute", "en")).toBe("/en/job-market")
  })
})

describe("freeTools", () => {
  it("lists only tools whose page exists", () => {
    for (const tool of freeTools) {
      const folder = tool.path("en").split("/").pop()!

      expect(
        existsSync(path.join(__dirname, "../app/[locale]", folder, "page.tsx"))
      ).toBe(true)
    }
  })

  it("names every tool in both languages", () => {
    for (const { key } of freeTools) {
      expect(fr.tools.items[key].name).toBeTruthy()
      expect(en.tools.items[key].name).toBeTruthy()
    }
  })

  it("has no dictionary entry for a tool that is not live", () => {
    expect(Object.keys(fr.tools.items).sort()).toEqual(
      freeTools.map(({ key }) => key).sort()
    )
  })
})

describe("sitemap", () => {
  it("declares the hub in every language, with its alternates", () => {
    const entries = sitemap()

    for (const locale of locales) {
      const entry = entries.find(({ url }) => url.endsWith(toolsPath(locale)))

      expect(entry?.alternates?.languages).toMatchObject({
        fr: expect.stringMatching(/\/fr\/outils$/),
        en: expect.stringMatching(/\/en\/tools$/),
      })
    }
  })
})

describe("sitemap and the free tools", () => {
  it("declares every live tool in both languages", () => {
    const urls = sitemap().map(({ url }) => url)

    for (const tool of freeTools) {
      for (const locale of locales) {
        expect(urls.some((url) => url.endsWith(tool.path(locale)))).toBe(true)
      }
    }
  })
})
