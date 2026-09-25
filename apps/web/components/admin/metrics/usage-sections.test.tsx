import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  EMPTY_USAGE,
  USAGE,
  textOf,
} from "@/components/admin/metrics/test-fixtures"
import { UsageSections } from "@/components/admin/metrics/usage-sections"

describe("UsageSections", () => {
  it("shows activity, engagement, templates, ATS scores and retention", () => {
    const content = textOf(renderToStaticMarkup(<UsageSections data={USAGE} />))

    expect(content).toContain("Analyses ATS")
    expect(content).toContain("Onboarding terminé64 %")
    expect(content).toContain("Durée moyenne14,5 min")
    expect(content).toContain("Moderne")
    // One line per engine, never pooled.
    expect(content).toContain("Barème v2 (30 CV)71 / 100")
    expect(content).toContain("Barème v1 (12 CV)64 / 100")
    expect(content).toContain("septembre 20262545 %—")
  })

  it("renders a fresh database", () => {
    const content = textOf(
      renderToStaticMarkup(<UsageSections data={EMPTY_USAGE} />)
    )

    expect(content).toContain("Onboarding terminé—")
    expect(content).toContain("Aucun CV noté sur la période.")
    expect(content).toContain("Aucune inscription à suivre.")
    expect(content).toContain("Rien sur la période.")
  })
})
