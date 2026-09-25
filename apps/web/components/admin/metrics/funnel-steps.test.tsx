import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FunnelSteps } from "@/components/admin/metrics/funnel-steps"
import { textOf } from "@/components/admin/metrics/test-fixtures"

describe("FunnelSteps", () => {
  it("rates each step against the one before and against the start", () => {
    const html = renderToStaticMarkup(
      <FunnelSteps
        steps={[
          { count: 100, label: "Inscription" },
          { count: 50, label: "Onboarding" },
          { count: 10, label: "Achat" },
        ]}
      />
    )

    expect(textOf(html)).toContain("50 · 50 %Achat")
    // The second step's rate is already against the start: said once.
    expect(textOf(html)).toContain("10 · 20 % (10 % du départ)")
    expect(html).toContain("width:100%")
    expect(html).toContain("width:10%")
  })

  it("rates a step against the one it names", () => {
    const html = textOf(
      renderToStaticMarkup(
        <FunnelSteps
          showFromStart={false}
          steps={[
            { count: 80, label: "Visiteurs" },
            { count: 40, label: "Résultat" },
            { against: 1, count: 5, label: "Clic" },
            { against: 1, count: 10, label: "Email" },
          ]}
        />
      )
    )

    expect(html).toContain("5 · 13 %")
    expect(html).toContain("10 · 25 %")
    expect(html).not.toContain("du départ")
  })

  /** "0 %" on a funnel nobody entered reads as a failure. */
  it("shows no rate after an empty step, and a dash when not measured", () => {
    const html = renderToStaticMarkup(
      <FunnelSteps
        steps={[
          { count: 0, label: "Visiteurs" },
          { count: 0, label: "Résultat" },
          { count: null, label: "Compte" },
        ]}
      />
    )

    expect(html).not.toContain("%<")
    expect(html).not.toContain(" %")
    expect(html).toContain("—")
    expect(html).toContain("width:0%")
  })
})
