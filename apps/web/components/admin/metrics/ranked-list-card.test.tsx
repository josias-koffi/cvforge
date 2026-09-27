import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RankedListCard } from "@/components/admin/metrics/ranked-list-card"

function render(items: Parameters<typeof RankedListCard>[0]["items"]) {
  return renderToStaticMarkup(
    <RankedListCard
      description="Sur 30 jours."
      items={items}
      title="Entreprises"
    />
  )
}

describe("RankedListCard", () => {
  it("sizes each bar against the first entry", () => {
    const html = render([
      { count: 12, label: "Airbus" },
      { count: 3, label: "Thales" },
    ])

    expect(html).toContain("width:100%")
    expect(html).toContain("width:25%")
  })

  it("puts the count in text, the bar being decorative", () => {
    const html = render([
      { count: 1234, detail: "Gironde", label: "Comptable" },
    ])

    expect(html).toContain("Comptable")
    expect(html).toContain(" · Gironde")
    expect(html.replace(/[  ]/g, " ")).toContain("1 234")
    expect(html).toMatch(
      /aria-hidden="true"[^>]*><div[^>]*data-slot="ranked-bar"/
    )
  })

  it("says so when there is nothing to rank", () => {
    const html = render([])

    expect(html).toContain("Rien sur la période.")
    expect(html).not.toContain("<ol")
  })

  it("draws no bar on all-zero counts", () => {
    expect(render([{ count: 0, label: "Airbus" }])).toContain("width:0%")
  })
})
