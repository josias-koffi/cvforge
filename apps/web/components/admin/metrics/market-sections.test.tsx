import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MarketSections } from "@/components/admin/metrics/market-sections"
import {
  EMPTY_MARKET,
  MARKET,
  textOf,
} from "@/components/admin/metrics/test-fixtures"

describe("MarketSections", () => {
  it("ranks what candidates aim at and follows the morning offers", () => {
    const content = textOf(
      renderToStaticMarkup(<MarketSections data={MARKET} />)
    )

    expect(content).toContain("Entreprises les plus postulées")
    expect(content).toContain("Comptable · Gironde7")
    expect(content).toContain("Vues100 · 50 %")
    expect(content).toContain("Postulées5 · 25 % (3 % du départ)")
    expect(content).toContain("Écartées par les candidats : 30")
  })

  it("renders a fresh database", () => {
    const html = renderToStaticMarkup(<MarketSections data={EMPTY_MARKET} />)

    expect(html.match(/Rien sur la période\./g)).toHaveLength(6)
    expect(textOf(html)).not.toContain("%")
  })
})
