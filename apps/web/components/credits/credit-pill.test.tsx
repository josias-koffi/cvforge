import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CreditPill } from "@/components/credits/credit-pill"

describe("CreditPill", () => {
  it("shows the amount, with the unit for screen readers", () => {
    const html = renderToStaticMarkup(<CreditPill amount={3} />)

    expect(html).toContain("3")
    expect(html).toContain("sr-only")
    expect(html).toContain("crédits")
  })

  it("uses the singular for one credit", () => {
    expect(renderToStaticMarkup(<CreditPill amount={1} />)).toContain("crédit<")
  })

  it("draws nothing for a free action", () => {
    expect(renderToStaticMarkup(<CreditPill amount={0} />)).toBe("")
    expect(renderToStaticMarkup(<CreditPill />)).toBe("")
  })
})
