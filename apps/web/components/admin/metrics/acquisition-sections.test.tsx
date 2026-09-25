import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AcquisitionSections } from "@/components/admin/metrics/acquisition-sections"
import {
  ACQUISITION,
  EMPTY_ACQUISITION,
  textOf,
} from "@/components/admin/metrics/test-fixtures"

describe("AcquisitionSections", () => {
  it("charts visitors per tool and draws each tool's funnel", () => {
    const content = textOf(
      renderToStaticMarkup(<AcquisitionSections data={ACQUISITION} />)
    )

    expect(content).toContain(
      "Sur la période : 89 visites (Analyse ATS : 80, Ce métier recrute-t-il ? : 9)."
    )
    // Call to action and email are both rated against the result.
    expect(content).toContain("Clic sur l'appel à l'action5 · 13 %")
    expect(content).toContain("Email saisi10 · 25 %")
    expect(content).toContain("Compte activé3 · 30 %")
    expect(content).toContain("Activation non mesurée")
    expect(content).toContain("Taux de déblocage25 %")
  })

  it("renders a fresh database", () => {
    const content = textOf(
      renderToStaticMarkup(<AcquisitionSections data={EMPTY_ACQUISITION} />)
    )

    expect(content).toContain("Sur la période : 0 visites.")
    expect(content).toContain("Taux de déblocage—")
  })
})
