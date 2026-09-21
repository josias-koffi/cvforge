import { afterEach, describe, expect, it } from "vitest"

import { LEGAL_LINKS, landingUrl, legalPath } from "@/lib/config"

const original = process.env.LANDING_URL

afterEach(() => {
  if (original === undefined) {
    delete process.env.LANDING_URL
  } else {
    process.env.LANDING_URL = original
  }
})

describe("landingUrl", () => {
  it("reads the origin per request and drops its trailing slash", () => {
    process.env.LANDING_URL = "https://cvspark.example/"

    expect(landingUrl("/fr/legal/cgu")).toBe("https://cvspark.example/fr/legal/cgu")
  })

  it("falls back to the local landing", () => {
    delete process.env.LANDING_URL

    expect(landingUrl("/fr/legal/cgu")).toBe("http://localhost:3101/fr/legal/cgu")
  })
})

describe("legalPath", () => {
  // In-app so the link never needs the public origin at build time.
  it("points at the redirect handler, not the public site", () => {
    expect(legalPath("terms")).toBe("/legal/terms")
    expect(legalPath("privacy")).toBe("/legal/privacy")
  })

  it("knows where each document lives on the site", () => {
    expect(LEGAL_LINKS).toEqual({
      terms: "/fr/legal/cgu",
      privacy: "/fr/legal/confidentialite",
    })
  })
})
