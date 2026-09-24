import { legalDocumentSlugs } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import nextConfig, { legalRedirects, resolveNextDistDir } from "../next.config"
import { locales } from "../lib/i18n"
import { atsPath } from "../lib/ats"
import { keywordMatchPath, toolsPath } from "../lib/tools"
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

  /**
   * The ATS page follows the story arrangement: the route folder carries the
   * English slug, the French address is rewritten onto it, and each language
   * redirects away from the other's wording. A slug renamed here and not in
   * `lib/ats` would 404 the top of the acquisition funnel.
   */
  describe("the ATS check", () => {
    it("serves each language under its own slug", async () => {
      const redirects = await nextConfig.redirects!()

      expect(redirects).toContainEqual({
        source: "/fr/ats-check",
        destination: "/fr/analyse-ats",
        permanent: true,
      })
      expect(redirects).toContainEqual({
        source: "/en/analyse-ats",
        destination: "/en/ats-check",
        permanent: true,
      })
    })

    it("rewrites the French address onto the shared route", async () => {
      const rewrites = await nextConfig.rewrites!()

      expect(rewrites).toContainEqual({
        source: "/fr/analyse-ats",
        destination: "/fr/ats-check",
      })
    })

    it("agrees with the paths lib/ats builds", async () => {
      const rewrites = (await nextConfig.rewrites!()) as {
        source: string
        destination: string
      }[]

      expect(rewrites.map((rewrite) => rewrite.source)).toContain(atsPath("fr"))
      expect(atsPath("en")).toBe("/en/ats-check")
    })

    /** A redirect pointing at another redirect's source would loop. */
    it("does not redirect an address it also redirects away from", async () => {
      const redirects = (await nextConfig.redirects!()) as {
        source: string
        destination: string
      }[]

      for (const redirect of redirects) {
        expect(redirects.map((other) => other.source)).not.toContain(
          redirect.destination
        )
      }
    })
  })

  /** The comparator, same arrangement again (US-136). */
  it("serves the comparator under each language's slug", async () => {
    const redirects = await nextConfig.redirects!()
    const rewrites = await nextConfig.rewrites!()

    expect(redirects).toContainEqual({
      source: "/fr/cv-job-match",
      destination: "/fr/comparateur-cv-offre",
      permanent: true,
    })
    expect(redirects).toContainEqual({
      source: "/en/comparateur-cv-offre",
      destination: "/en/cv-job-match",
      permanent: true,
    })
    expect(rewrites).toContainEqual({
      source: keywordMatchPath("fr"),
      destination: "/fr/cv-job-match",
    })
  })

  /** The free tools hub, same arrangement as the ATS check (US-135). */
  describe("the free tools hub", () => {
    it("redirects each language away from the other's slug", async () => {
      const redirects = await nextConfig.redirects!()

      expect(redirects).toContainEqual({
        source: "/fr/tools",
        destination: "/fr/outils",
        permanent: true,
      })
      expect(redirects).toContainEqual({
        source: "/en/outils",
        destination: "/en/tools",
        permanent: true,
      })
    })

    it("rewrites the French address onto the shared route", async () => {
      const rewrites = await nextConfig.rewrites!()

      expect(rewrites).toContainEqual({
        source: toolsPath("fr"),
        destination: "/fr/tools",
      })
    })
  })
})
