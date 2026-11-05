import { describe, expect, it } from "vitest"

import { buildCsp, newNonce } from "./csp"

describe("buildCsp", () => {
  it("should tie scripts to the request's nonce and forbid plugins, framing and base changes", () => {
    const csp = buildCsp("abc", false)

    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("report-uri /api/csp-report")
  })

  it("should allow eval and websockets only in development", () => {
    expect(buildCsp("n", true)).toContain("'unsafe-eval'")
    expect(buildCsp("n", false)).not.toContain("'unsafe-eval'")
    expect(buildCsp("n", false)).not.toContain("ws:")
  })

  it("should mint a different nonce each time", () => {
    expect(newNonce()).not.toBe(newNonce())
  })
})
