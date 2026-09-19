import { describe, expect, it } from "vitest"

import {
  creditCostLabel,
  formatApplications,
  formatCredits,
  formatDate,
  formatPrice,
  splitLines,
  statusVariants,
} from "@/lib/format"

describe("format helpers", () => {
  it("splits multiline input into trimmed non-empty entries", () => {
    expect(splitLines(" Node.js \n\n  NestJS\n ")).toEqual(["Node.js", "NestJS"])
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

  it("gives each application status a distinct semantic badge", () => {
    expect(new Set(Object.values(statusVariants)).size).toBe(5)
  })
})
