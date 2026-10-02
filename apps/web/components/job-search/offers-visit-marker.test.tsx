import { afterEach, describe, expect, it, vi } from "vitest"

import { writeVisitCookie } from "@/components/job-search/offers-visit-marker"
import { OFFERS_VISIT_COOKIE } from "@/lib/offer-freshness"

describe("writeVisitCookie (US-167)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("keeps the opening time for a year, readable back by the page", () => {
    const document = { cookie: "" }
    vi.stubGlobal("document", document)

    writeVisitCookie("2026-10-04T09:00:00.000Z")

    expect(document.cookie).toBe(
      `${OFFERS_VISIT_COOKIE}=2026-10-04T09%3A00%3A00.000Z; path=/; max-age=31536000; samesite=lax`
    )
    expect(decodeURIComponent("2026-10-04T09%3A00%3A00.000Z")).toBe(
      "2026-10-04T09:00:00.000Z"
    )
  })
})
