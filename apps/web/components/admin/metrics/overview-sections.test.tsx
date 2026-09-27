import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OverviewSections } from "@/components/admin/metrics/overview-sections"
import {
  EMPTY_OVERVIEW,
  OVERVIEW,
  textOf,
} from "@/components/admin/metrics/test-fixtures"

describe("OverviewSections", () => {
  it("shows the headline figures, their change and the findings", () => {
    const html = renderToStaticMarkup(<OverviewSections data={OVERVIEW} />)

    expect(textOf(html)).toContain("100,00 €")
    expect(html).toContain("Nouveaux acheteurs")
    // AI cost doubled: a rise, shown as bad news.
    expect(html).toMatch(/data-variant="destructive"[^>]*>.*?\+100 %/)
    expect(textOf(html)).toContain(
      "Sur la période : 100,00 € encaissés, 12,00 € de coût IA."
    )
    expect(html).toContain("Coût IA en hausse")
  })

  it("renders a fresh database without a badge or a finding", () => {
    const html = renderToStaticMarkup(
      <OverviewSections data={EMPTY_OVERVIEW} />
    )

    expect(textOf(html)).toContain("0,00 €")
    expect(html).not.toContain('data-slot="badge"')
    expect(html).toContain("Rien de notable sur la période")
    expect(html).toContain("depuis le lancement")
  })
})
