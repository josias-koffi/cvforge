import { afterEach, describe, expect, it, vi } from "vitest"

import robots from "./robots"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("robots.txt", () => {
  it("opens production to crawlers, with its sitemap", () => {
    vi.stubEnv("DEPLOY_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://jobspark.koklo.dev")
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/login", "/api/"] },
      sitemap: "https://jobspark.koklo.dev/sitemap.xml",
    })
  })

  it("advertises no sitemap elsewhere, and lets crawlers read the noindex", () => {
    vi.stubEnv("DEPLOY_ENV", "staging")
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/" } })
  })
})
