import { describe, expect, it } from "vitest"

import {
  centsToUnits,
  deltaPercent,
  formatBucket,
  formatBucketLong,
  formatCount,
  formatDays,
  formatDelta,
  formatDurationMs,
  formatEurCents,
  formatMinutes,
  formatRate,
  formatUsd,
  ratio,
  sumOf,
  usdToEurCents,
} from "@/lib/admin-metrics/format"

/** Intl uses narrow no-break spaces; the tests compare with plain ones. */
const plain = (value: string) => value.replace(/[  ]/g, " ")

describe("money", () => {
  it("formats EUR cents, and a missing amount as a dash", () => {
    expect(plain(formatEurCents(123456))).toBe("1 234,56 €")
    expect(formatEurCents(null)).toBe("—")
  })

  it("keeps four decimals on sub-dollar AI costs", () => {
    expect(plain(formatUsd(0.0123))).toBe("0,0123 $US")
    expect(plain(formatUsd(12.5))).toBe("12,50 $US")
    expect(plain(formatUsd(0))).toBe("0,00 $US")
    expect(formatUsd(null)).toBe("—")
  })

  it("converts USD to EUR cents at the given rate", () => {
    expect(usdToEurCents(1.2, 0.92)).toBe(110)
    expect(centsToUnits(1234)).toBe(12.34)
  })
})

describe("rates", () => {
  it("formats a percent, and null as a dash", () => {
    expect(plain(formatRate(12.345))).toBe("12,3 %")
    expect(formatRate(null)).toBe("—")
  })

  it("has no ratio over an empty whole", () => {
    expect(ratio(1, 4)).toBe(25)
    expect(ratio(1, 0)).toBeNull()
  })
})

describe("deltaPercent", () => {
  it("measures the change against the previous period", () => {
    expect(deltaPercent({ previous: 100, value: 150 })).toBe(50)
    expect(deltaPercent({ previous: 100, value: 80 })).toBe(-20)
  })

  /** "+∞ %" or a delta on the whole history says nothing. */
  it("has no delta without a previous figure, or from zero", () => {
    expect(deltaPercent({ previous: null, value: 10 })).toBeNull()
    expect(deltaPercent({ previous: 0, value: 10 })).toBeNull()
  })

  it("reads a negative base the right way round", () => {
    expect(deltaPercent({ previous: -100, value: -50 })).toBe(50)
  })

  it("formats with a sign and a real minus", () => {
    expect(plain(formatDelta(12.4))).toBe("+12 %")
    expect(plain(formatDelta(-5.6))).toBe("−6 %")
    expect(formatDelta(0.2)).toBe("0 %")
  })
})

describe("durations and counts", () => {
  it("formats them in French", () => {
    expect(plain(formatCount(12345))).toBe("12 345")
    expect(plain(formatDurationMs(4200))).toBe("4,2 s")
    expect(formatDurationMs(125000)).toBe("2 min 5 s")
    expect(plain(formatMinutes(14.5))).toBe("14,5 min")
    expect(formatMinutes(null)).toBe("—")
    expect(formatDays(3)).toBe("3 j")
    expect(formatDays(null)).toBe("—")
  })
})

describe("formatBucket", () => {
  it("labels a day, a week and a month", () => {
    expect(formatBucket("2026-09-25", "day")).toBe("25 sept.")
    expect(formatBucket("2026-09-22", "week")).toBe("sem. du 22 sept.")
    expect(formatBucket("2026-09-01", "month")).toBe("sept. 2026")
  })

  /** A UTC bucket must not slip to the day before in another time zone. */
  it("reads the bucket in UTC", () => {
    expect(formatBucket("2026-09-01T00:00:00.000Z", "day")).toBe("1 sept.")
  })

  it("spells the tooltip out", () => {
    expect(formatBucketLong("2026-09-25", "day")).toBe("25 septembre 2026")
    expect(formatBucketLong("2026-09-22", "week")).toBe(
      "Semaine du 22 septembre 2026"
    )
    expect(formatBucketLong("2026-09-01", "month")).toBe("septembre 2026")
  })

  it("returns an unreadable date as is", () => {
    expect(formatBucket("n/a", "day")).toBe("n/a")
  })
})

describe("sumOf", () => {
  it("adds a key over rows, skipping missing values", () => {
    expect(sumOf([{ a: 1 }, { a: 2 }, { b: 3 }], "a")).toBe(3)
    expect(sumOf([], "a")).toBe(0)
  })
})
