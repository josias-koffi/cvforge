import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "./route"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/analytics-config", () => {
  it("serves the container id the deployment was given", async () => {
    vi.stubEnv("GTM_CONTAINER_ID", "GTM-AB12CD")
    const response = GET()
    expect(await response.json()).toEqual({ gtmId: "GTM-AB12CD" })
    expect(response.headers.get("cache-control")).toBe("public, max-age=300")
  })

  it("serves null without analytics, or before infra has made the container", async () => {
    for (const value of ["", "pending", "not an id"]) {
      vi.stubEnv("GTM_CONTAINER_ID", value)
      expect(await GET().json()).toEqual({ gtmId: null })
    }
  })
})
