import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AiCostSections } from "@/components/admin/metrics/ai-cost-sections"
import {
  AI_COSTS,
  EMPTY_AI_COSTS,
  textOf,
} from "@/components/admin/metrics/test-fixtures"

describe("AiCostSections", () => {
  it("shows cost in dollars and euros, units, features and models", () => {
    const html = renderToStaticMarkup(<AiCostSections data={AI_COSTS} />)
    const content = textOf(html)

    expect(content).toContain("Suivi depuis le 20 sept. 2026")
    expect(content).toContain("1,20 $US")
    expect(content).toContain("≈ 1,10 €")
    expect(content).toContain("Minute d'entretien")
    expect(content).toContain("Génération de CV")
    expect(content).toContain("openai/gpt-5-mini")
    expect(content).toContain("Environ 5 jours d'autonomie")
    expect(content).toContain("À recharger")
    // A unit that loses money is flagged in red.
    expect(html).toMatch(/text-destructive[^>]*>-25 %/)
  })

  it("explains that nothing is tracked yet on a fresh database", () => {
    const content = textOf(
      renderToStaticMarkup(<AiCostSections data={EMPTY_AI_COSTS} />)
    )

    expect(content).toContain("Aucun appel IA enregistré")
    expect(content).toContain("Supervision inactive")
    expect(content).not.toContain("Suivi depuis")
  })

  it("renders empty tables once tracking has started", () => {
    const content = textOf(
      renderToStaticMarkup(
        <AiCostSections
          data={{
            ...EMPTY_AI_COSTS,
            trackingSince: "2026-09-20T00:00:00.000Z",
          }}
        />
      )
    )

    expect(content).toContain("Aucune action facturée sur la période.")
    expect(content).toContain("Aucun appel IA sur la période.")
  })
})
