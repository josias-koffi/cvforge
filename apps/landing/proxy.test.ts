import { describe, expect, it } from "vitest"

import { config } from "./proxy"

/** Next anchors the matcher against the whole path; an unanchored RegExp would
 *  match `/api/ats-scan` from its fourth character and hide the bug. */
const matcher = new RegExp(`^${config.matcher[0]!}$`)

function matches(pathname: string) {
  return matcher.test(pathname)
}

/**
 * The proxy prefixes locale-less paths with a language. Anything that is not a
 * page must be excluded, or the redirect turns a browser POST into a GET on an
 * address that does not exist.
 */
describe("the proxy matcher", () => {
  it("handles pages, which is what it is for", () => {
    expect(matches("/")).toBe(true)
    expect(matches("/analyse-ats")).toBe(true)
    expect(matches("/fr/analyse-ats")).toBe(true)
  })

  /**
   * Regression: `POST /api/ats-scan` was redirected to `/en/api/ats-scan` and
   * answered 404, which broke the entire ATS funnel in the browser while every
   * unit test passed — they call the route handler directly.
   */
  it("leaves route handlers alone", () => {
    expect(matches("/api/ats-scan")).toBe(false)
    expect(matches("/api/ats-scan/abc/unlock")).toBe(false)
  })

  it("leaves the framework and the login redirect alone", () => {
    expect(matches("/_next/static/chunk.js")).toBe(false)
    expect(matches("/login")).toBe(false)
  })

  it("leaves files alone", () => {
    expect(matches("/favicon.ico")).toBe(false)
    expect(matches("/screenshots/light/dashboard.webp")).toBe(false)
    expect(matches("/sitemap.xml")).toBe(false)
  })
})
