import { legalDocumentSlugs } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import nextConfig, { legalRedirects, resolveNextDistDir } from "../next.config"
import { locales } from "../lib/i18n"
import { legalPath } from "../lib/legal"

describe("landing next config", () => {
  it("builds a standalone server without overriding distDir by default", () => {
    expect(nextConfig.output).toBe("standalone")
    expect(nextConfig.distDir).toBeUndefined()
  })

  it("accepts a relative NEXT_DIST_DIR", () => {
    expect(resolveNextDistDir(" tmp/cvforge-landing-next ")).toBe(
      "tmp/cvforge-landing-next"
    )
  })

  it("ignores absolute or escaping NEXT_DIST_DIR values", () => {
    expect(resolveNextDistDir("/tmp/cvforge-landing-next")).toBeUndefined()
    expect(resolveNextDistDir("../outside")).toBeUndefined()
    expect(resolveNextDistDir("a/../../b")).toBeUndefined()
    expect(resolveNextDistDir("")).toBeUndefined()
  })

  // The config cannot import lib/legal, so the two must be checked to agree:
  // a slug renamed on one side and not the other would 404 a legal page.
  it("redirects every legal slug to the address its language serves", () => {
    const redirects = legalRedirects()

    expect(redirects).toHaveLength(legalDocumentSlugs.length * locales.length)

    for (const redirect of redirects) {
      expect(redirects.map((other) => other.source)).not.toContain(
        redirect.destination
      )
    }

    for (const slug of legalDocumentSlugs) {
      for (const locale of locales) {
        const served = legalPath(locale, slug)
        const other = locales.find((candidate) => candidate !== locale)!

        expect(redirects).toContainEqual({
          source: `/${locale}/legal/${legalPath(other, slug).split("/").pop()}`,
          destination: served,
          permanent: true,
        })
      }
    }
  })
})
