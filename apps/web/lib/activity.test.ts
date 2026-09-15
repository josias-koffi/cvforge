import type { DraftApplication } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import { buildActivitySeries } from "@/lib/activity"

function offer(overrides: Partial<DraftApplication>): DraftApplication {
  return {
    createdAt: "2026-09-10T10:00:00.000Z",
    cvGeneratedAt: null,
    extracted: {
      companyName: null,
      contractType: null,
      language: "fr",
      location: null,
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "",
      title: "Dev",
    },
    id: "1",
    offerTextPreview: "",
    offerUrl: null,
    sourceLabel: "",
    sourceType: "text",
    status: "draft",
    statusHistory: [],
    updatedAt: "2026-09-10T10:00:00.000Z",
    userEmail: "a@b.c",
    ...overrides,
  }
}

describe("buildActivitySeries", () => {
  const now = new Date("2026-09-15T12:00:00.000Z")

  it("returns one zeroed point per day, oldest first", () => {
    const series = buildActivitySeries([], 7, now)

    expect(series).toHaveLength(7)
    expect(series[0].date).toBe("2026-09-09")
    expect(series[6]).toEqual({ date: "2026-09-15", documents: 0, imported: 0 })
  })

  it("counts imports and generated documents on their day and ignores older events", () => {
    const series = buildActivitySeries(
      [
        offer({ cvGeneratedAt: "2026-09-15T08:00:00.000Z", letterGeneratedAt: "2026-09-15T09:00:00.000Z" }),
        offer({ createdAt: "2026-01-01T00:00:00.000Z" }),
      ],
      7,
      now
    )

    expect(series.find((point) => point.date === "2026-09-10")?.imported).toBe(1)
    expect(series.find((point) => point.date === "2026-09-15")?.documents).toBe(2)
    expect(series.reduce((total, point) => total + point.imported, 0)).toBe(1)
  })
})
