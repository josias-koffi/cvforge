import { describe, expect, it } from "vitest"

import { atsPath, atsSlugs, isAtsSlug } from "@/lib/ats"
import { localizedPath, locales } from "@/lib/i18n"

describe("atsPath", () => {
  it("gives each language its own address", () => {
    expect(atsPath("fr")).toBe("/fr/analyse-ats")
    expect(atsPath("en")).toBe("/en/ats-check")
  })

  it("covers every supported locale", () => {
    for (const locale of locales) {
      expect(atsSlugs[locale]).toBeTruthy()
    }
  })
})

describe("isAtsSlug", () => {
  it("recognises the page in either language", () => {
    expect(isAtsSlug("analyse-ats")).toBe(true)
    expect(isAtsSlug("ats-check")).toBe(true)
  })

  it("does not claim unrelated segments", () => {
    expect(isAtsSlug("histoire")).toBe(false)
    expect(isAtsSlug("legal")).toBe(false)
    expect(isAtsSlug("")).toBe(false)
  })
})

/**
 * The language switcher rewrites the current path. A page whose slug is not
 * translated here keeps the other language's wording and 404s.
 */
describe("switching language on the ATS page", () => {
  it("translates the slug both ways", () => {
    expect(localizedPath("/fr/analyse-ats", "en")).toBe("/en/ats-check")
    expect(localizedPath("/en/ats-check", "fr")).toBe("/fr/analyse-ats")
  })

  it("leaves the story page working as before", () => {
    expect(localizedPath("/fr/histoire", "en")).toBe("/en/story")
    expect(localizedPath("/en/story", "fr")).toBe("/fr/histoire")
  })

  it("leaves a path with no localised slug alone", () => {
    expect(localizedPath("/fr", "en")).toBe("/en")
  })
})
