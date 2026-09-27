import { describe, expect, it, vi } from "vitest"

import { atsFunnel, toolFunnel } from "@/lib/ats-funnel"

describe("atsFunnel", () => {
  it.each([
    ["viewed", "view"],
    ["scanned", "result"],
    ["ctaClicked", "cta_click"],
    ["emailSubmitted", "email_submitted"],
  ] as const)(
    "reports %s as the %s step, in the page's language",
    (method, step) => {
      const track = vi.fn()

      atsFunnel("en", track)[method]()

      expect(track).toHaveBeenCalledWith("ats", step, "en")
    }
  )
})

describe("toolFunnel", () => {
  it("reports each step under the tool it is given", () => {
    const track = vi.fn()

    toolFunnel("keyword_match", "fr", track).scanned()

    expect(track).toHaveBeenCalledWith("keyword_match", "result", "fr")
  })
})
