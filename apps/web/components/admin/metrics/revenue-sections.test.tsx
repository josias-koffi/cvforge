import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RevenueSections } from "@/components/admin/metrics/revenue-sections"
import {
  EMPTY_REVENUE,
  REVENUE,
  textOf,
} from "@/components/admin/metrics/test-fixtures"

describe("RevenueSections", () => {
  it("shows revenue, the conversion funnel, offers and credits", () => {
    const content = textOf(
      renderToStaticMarkup(<RevenueSections data={REVENUE} />)
    )

    expect(content).toContain("118,80 €")
    expect(content).toContain("Taux de réachat22,2 %")
    expect(content).toContain("Délai médian avant le 1er achat3 j")
    expect(content).toContain("1er achat10 · 33 % (10 % du départ)")
    expect(content).toContain("Pack Essentiel")
    expect(content).toContain("Bienvenue100")
  })

  it("renders a fresh database with dashes, not zero rates", () => {
    const content = textOf(
      renderToStaticMarkup(<RevenueSections data={EMPTY_REVENUE} />)
    )

    expect(content).toContain("Taux de réachat—")
    expect(content).toContain("Paniers abandonnés—")
    expect(content).toContain("Aucune vente sur la période.")
    expect(content).not.toContain("%")
  })
})
