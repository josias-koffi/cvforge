import { describe, expect, it } from "vitest"

import {
  creditCostLabel,
  formatApplications,
  formatFileSize,
  interviewCostLabel,
  formatCredits,
  formatDate,
  formatPrice,
  formatRelativeDays,
  formatTime,
  splitLines,
  statusVariants,
} from "@/lib/format"

describe("format helpers", () => {
  it("splits multiline input into trimmed non-empty entries", () => {
    expect(splitLines(" Node.js \n\n  NestJS\n ")).toEqual([
      "Node.js",
      "NestJS",
    ])
  })

  it("formats missing dates and euro prices", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatPrice(999).replace(/\s/g, " ")).toBe("9,99 €")
  })

  it("pluralizes credit amounts and reads costs from the shared table", () => {
    expect(formatCredits(1)).toBe("1 crédit")
    expect(formatCredits(3)).toBe("3 crédits")
    expect(formatApplications(1)).toBe("1 candidature")
    expect(formatApplications(20)).toBe("20 candidatures")
    expect(creditCostLabel("offer_enrichment")).toBe("Coût : 1 crédit")
    expect(creditCostLabel("cv_generation")).toBe("Coût : 3 crédits")
  })

  it("prices an interview by the length the candidate picked", () => {
    expect(interviewCostLabel(10)).toBe("Coût : 10 crédits")
    expect(interviewCostLabel(30)).toBe("Coût : 30 crédits")
  })

  it("gives each application status a distinct semantic badge", () => {
    expect(new Set(Object.values(statusVariants)).size).toBe(5)
  })
})

describe("formatTime", () => {
  it("shows clock time, for a transcript whose date is already in the header", () => {
    expect(formatTime("2026-04-24T13:05:00.000Z")).toMatch(/^\d{2}:\d{2}$/)
  })

  it("degrades to a placeholder rather than rendering NaN", () => {
    expect(formatTime("nonsense")).toBe("--:--")
  })
})

describe("formatFileSize", () => {
  it("stays in kilobytes for a small file", () => {
    expect(formatFileSize(862208)).toBe("842 Ko")
  })

  it("switches to megabytes past a thousand kilobytes", () => {
    expect(formatFileSize(1887437)).toBe("1,8 Mo")
  })

  it("never shows a 0 Ko file", () => {
    expect(formatFileSize(120)).toBe("1 Ko")
  })
})

describe("formatRelativeDays", () => {
  const now = Date.parse("2026-09-24T10:00:00Z")

  it("says how fresh an offer is, in days", () => {
    expect(formatRelativeDays("2026-09-24T08:00:00Z", now)).toBe("aujourd’hui")
    expect(formatRelativeDays("2026-09-23T08:00:00Z", now)).toBe("hier")
    expect(formatRelativeDays("2026-09-19T08:00:00Z", now)).toBe(
      "il y a 5 jours"
    )
  })

  it("falls back to the date past a month, and to a dash without one", () => {
    expect(formatRelativeDays("2026-07-01T08:00:00Z", now)).toBe(
      "01 juil. 2026"
    )
    expect(formatRelativeDays(null, now)).toBe("—")
    expect(formatRelativeDays("not a date", now)).toBe("—")
  })
})
