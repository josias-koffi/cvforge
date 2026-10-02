import { describe, expect, it } from "vitest"

import type { JobMatch } from "@/lib/job-search"
import { formatFreshness, splitSinceVisit } from "@/lib/offer-freshness"

const NOW = Date.parse("2026-10-04T10:00:00Z")

describe("formatFreshness (US-167)", () => {
  it("counts minutes, then hours, for the day's offers", () => {
    expect(formatFreshness("2026-10-04T09:59:40Z", NOW)).toBe("à l'instant")
    expect(formatFreshness("2026-10-04T09:48:00Z", NOW)).toBe("il y a 12 min")
    expect(formatFreshness("2026-10-04T07:10:00Z", NOW)).toBe("il y a 2 h")
    expect(formatFreshness("2026-10-03T10:30:00Z", NOW)).toBe("il y a 23 h")
  })

  it("dates an older offer on Paris time, whatever the machine's zone", () => {
    // 22:30 UTC on the 1st is 0:30 on the 2nd in Paris.
    expect(formatFreshness("2026-10-01T22:30:00Z", NOW)).toBe("le 2 oct.")
    expect(formatFreshness("2026-10-01T21:30:00Z", NOW)).toBe("le 1 oct.")
  })

  it("never says « dans X min » for a clock slightly ahead, nor anything for no date", () => {
    expect(formatFreshness("2026-10-04T10:02:00Z", NOW)).toBe("à l'instant")
    expect(formatFreshness(null, NOW)).toBeNull()
    expect(formatFreshness("pas une date", NOW)).toBeNull()
  })
})

function match(id: string, createdAt: string, publishedAt: string | null) {
  return {
    createdAt,
    job: { firstSeenAt: createdAt, publishedAt },
    jobId: id,
  } as unknown as JobMatch
}

describe("splitSinceVisit (US-167)", () => {
  const morning = match(
    "morning",
    "2026-10-04T04:00:00Z",
    "2026-10-03T15:00:00Z"
  )
  const alertA = match("a", "2026-10-04T09:05:00Z", "2026-10-04T09:00:00Z")
  const alertB = match("b", "2026-10-04T09:40:00Z", "2026-10-04T09:38:00Z")
  const noDate = match("c", "2026-10-04T09:20:00Z", null)

  it("puts first what arrived since the last visit, the latest published first", () => {
    const { fresh, rest } = splitSinceVisit(
      [morning, alertA, alertB, noDate],
      "2026-10-04T08:00:00.000Z"
    )

    expect(fresh.map((entry) => entry.jobId)).toEqual(["b", "c", "a"])
    expect(rest.map((entry) => entry.jobId)).toEqual(["morning"])
  })

  it("shows no « nouvelles » section on a first visit or an unreadable one", () => {
    expect(splitSinceVisit([morning, alertA], null).fresh).toEqual([])
    expect(splitSinceVisit([morning, alertA], "hier").rest).toHaveLength(2)
  })
})
