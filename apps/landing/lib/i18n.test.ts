import { describe, expect, it } from "vitest"

import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { format, localizedPath, negotiateLocale, storyPath } from "@/lib/i18n"

function shape(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shape)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, shape(child)])
    )
  }
  return typeof value
}

describe("dictionaries", () => {
  it("keep the same keys and list lengths in French and English", () => {
    expect(shape(en)).toEqual(shape(fr))
  })

  it("keep the same placeholders in both languages", () => {
    const placeholders = (text: string) => text.match(/\{\w+\}/g) ?? []
    for (const key of [
      "creditsLabel",
      "applicationsLabel",
      "buy",
      "costsNote",
    ] as const) {
      expect(placeholders(en.pricing[key])).toEqual(
        placeholders(fr.pricing[key])
      )
    }
  })
})

describe("negotiateLocale", () => {
  it("defaults to French without a header or supported language", () => {
    expect(negotiateLocale(null)).toBe("fr")
    expect(negotiateLocale("de-DE,es;q=0.8")).toBe("fr")
  })

  it("honours q-values and regional tags", () => {
    expect(negotiateLocale("en-GB,en;q=0.9,fr;q=0.8")).toBe("en")
    expect(negotiateLocale("de;q=1,fr;q=0.5,en;q=0.7")).toBe("en")
    expect(negotiateLocale("en;q=0,fr-CA")).toBe("fr")
  })
})

describe("localizedPath", () => {
  it("swaps the locale prefix and keeps anchors-free paths", () => {
    expect(localizedPath("/fr", "en")).toBe("/en")
    expect(localizedPath("/en/", "fr")).toBe("/fr")
  })

  it("translates the story slug", () => {
    expect(localizedPath("/fr/histoire", "en")).toBe("/en/story")
    expect(localizedPath(storyPath("en"), "fr")).toBe("/fr/histoire")
  })
})

describe("format", () => {
  it("replaces known placeholders and leaves unknown ones", () => {
    expect(format("{count} of {total}", { count: 3 })).toBe("3 of {total}")
  })
})
