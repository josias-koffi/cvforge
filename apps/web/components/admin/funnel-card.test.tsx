import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FunnelCard } from "@/components/admin/funnel-card"
import type { AcquisitionFunnel } from "@/lib/metrics"

const FUNNEL: AcquisitionFunnel = {
  accountsActivated: 3,
  ctaClicks: 5,
  emailsSubmitted: 10,
  results: 40,
  tool: "ats",
  visitors: 80,
}

function render(funnel: Partial<AcquisitionFunnel> = {}) {
  return renderToStaticMarkup(
    <FunnelCard funnel={{ ...FUNNEL, ...funnel }} windowDays={30} />
  )
}

describe("FunnelCard", () => {
  it("names the tool in words, never by its id", () => {
    expect(render()).toContain("Tunnel · Analyse ATS (30 j)")
  })

  it("rates each step against the one it follows", () => {
    const markup = render()

    expect(markup).toContain("80")
    expect(markup).toContain("40 · 50 %")
    // The call to action and the email both follow the result.
    expect(markup).toContain("5 · 13 %")
    expect(markup).toContain("10 · 25 %")
    expect(markup).toContain("3 · 30 %")
  })

  /** "0 %" on an empty funnel reads as a failure. */
  it("shows no rate after an empty step", () => {
    const markup = render({
      accountsActivated: 0,
      ctaClicks: 0,
      emailsSubmitted: 0,
      results: 0,
      visitors: 0,
    })

    expect(markup).not.toContain("%")
  })

  it("says the activation is not measured, rather than showing a zero", () => {
    const markup = render({ accountsActivated: null })

    expect(markup).toContain("—")
    expect(markup).toContain("Activation non mesurée")
  })
})
