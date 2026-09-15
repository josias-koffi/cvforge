import { describe, expect, it } from "vitest"

import { formatDate, formatPrice, splitLines } from "@/lib/format"

describe("format helpers", () => {
  it("splits multiline input into trimmed non-empty entries", () => {
    expect(splitLines(" Node.js \n\n  NestJS\n ")).toEqual(["Node.js", "NestJS"])
  })

  it("formats missing dates and euro prices", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatPrice(999).replace(/\s/g, " ")).toBe("9,99 €")
  })
})
