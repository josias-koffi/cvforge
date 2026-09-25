import { describe, expect, it } from "vitest"

import {
  parsePeriod,
  periodLabels,
  PERIODS,
  withPeriod,
} from "@/lib/admin-metrics/period"

describe("parsePeriod", () => {
  it("keeps a known period", () => {
    expect(parsePeriod("7")).toBe("7")
    expect(parsePeriod("all")).toBe("all")
  })

  /** A bad link shows the default figures rather than an error page. */
  it("falls back to 30 days on anything else", () => {
    expect(parsePeriod(undefined)).toBe("30")
    expect(parsePeriod(null)).toBe("30")
    expect(parsePeriod("14")).toBe("30")
    expect(parsePeriod("")).toBe("30")
  })

  it("reads the first value of a repeated param", () => {
    expect(parsePeriod(["90", "7"])).toBe("90")
  })
})

describe("withPeriod", () => {
  it("leaves the default out of the URL", () => {
    expect(withPeriod("/admin/metrics/revenus", "30")).toBe(
      "/admin/metrics/revenus"
    )
  })

  it("appends any other period", () => {
    expect(withPeriod("/admin/metrics", "365")).toBe(
      "/admin/metrics?periode=365"
    )
    expect(withPeriod("/admin/metrics?tab=x", "7")).toBe(
      "/admin/metrics?tab=x&periode=7"
    )
  })
})

describe("periodLabels", () => {
  it("names every period, in the switch's order", () => {
    expect(PERIODS.map((period) => periodLabels[period])).toEqual([
      "7 j",
      "30 j",
      "90 j",
      "12 mois",
      "Tout",
    ])
  })
})
