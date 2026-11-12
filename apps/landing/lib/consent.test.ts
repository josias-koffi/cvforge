import { describe, expect, it } from "vitest"

import {
  analyticsCookieRemovals,
  CONSENT_MAX_AGE_SECONDS,
  consentCookie,
  cookieDomains,
  parseConsent,
} from "@/lib/consent"

describe("the stored cookie choice", () => {
  it("reads back what it wrote", () => {
    for (const choice of ["granted", "denied"] as const) {
      const written = consentCookie(choice, true).split(";")[0]!
      expect(parseConsent(`theme=dark; ${written}; other=1`)).toBe(choice)
    }
  })

  it("asks again without an answer, or with one to an older banner", () => {
    expect(parseConsent("")).toBeNull()
    expect(parseConsent("theme=dark")).toBeNull()
    expect(parseConsent("jobspark_consent=v0.granted")).toBeNull()
    expect(parseConsent("jobspark_consent=yes")).toBeNull()
  })

  it("is kept six months, site-wide, and Secure only over https", () => {
    expect(CONSENT_MAX_AGE_SECONDS).toBe(182 * 24 * 3600)
    expect(consentCookie("denied", true)).toBe(
      `jobspark_consent=v1.denied; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax; Secure`
    )
    expect(consentCookie("granted", false)).not.toContain("Secure")
  })
})

describe("removing the GA cookies after a refusal", () => {
  it("tries every domain GA may have written on, down to the registrable one", () => {
    expect(cookieDomains("jobspark-staging.koklo.dev")).toEqual([
      "jobspark-staging.koklo.dev",
      "koklo.dev",
    ])
    expect(cookieDomains("localhost")).toEqual(["localhost"])
    expect(cookieDomains("127.0.0.1")).toEqual(["127.0.0.1"])
  })

  it("expires _ga and _ga_<stream>, and nothing else", () => {
    const removals = analyticsCookieRemovals(
      "_ga=GA1.1.1; _ga_ABC123=GS1; _gat=1; jobspark_consent=v1.granted",
      "jobspark.koklo.dev"
    )
    expect(removals).toEqual([
      "_ga=; Max-Age=0; Path=/",
      "_ga=; Max-Age=0; Path=/; Domain=jobspark.koklo.dev",
      "_ga=; Max-Age=0; Path=/; Domain=koklo.dev",
      "_ga_ABC123=; Max-Age=0; Path=/",
      "_ga_ABC123=; Max-Age=0; Path=/; Domain=jobspark.koklo.dev",
      "_ga_ABC123=; Max-Age=0; Path=/; Domain=koklo.dev",
    ])
  })
})
