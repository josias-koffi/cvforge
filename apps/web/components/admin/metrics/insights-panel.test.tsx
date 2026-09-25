import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { InsightsPanel } from "@/components/admin/metrics/insights-panel"

const INSIGHT = {
  detail: "Deux unités sur cinq coûtent plus que leur prix.",
  href: "/admin/metrics/couts-ia",
  id: "negative-margin",
  tone: "bad" as const,
  title: "Marge négative",
}

describe("InsightsPanel", () => {
  it("lists each finding with its tone and a link to its tab", () => {
    const html = renderToStaticMarkup(
      <InsightsPanel insights={[INSIGHT]} period="30" />
    )

    expect(html).toContain("Marge négative")
    expect(html).toContain(INSIGHT.detail)
    expect(html).toContain("Problème :")
    expect(html).toContain('href="/admin/metrics/couts-ia"')
  })

  it("keeps the period on the link", () => {
    const html = renderToStaticMarkup(
      <InsightsPanel insights={[{ ...INSIGHT, tone: "good" }]} period="90" />
    )

    expect(html).toContain('href="/admin/metrics/couts-ia?periode=90"')
    expect(html).toContain("Bonne nouvelle :")
  })

  it("says there is nothing to report", () => {
    const html = renderToStaticMarkup(
      <InsightsPanel insights={[]} period="30" />
    )

    expect(html).toContain("Rien de notable sur la période")
    expect(html).not.toContain("<ul")
  })
})
