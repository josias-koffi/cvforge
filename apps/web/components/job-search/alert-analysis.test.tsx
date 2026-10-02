import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  AlertAnalysis,
  AlertVerdictBadge,
} from "@/components/job-search/alert-analysis"

const analysis = {
  highlights: ["Vos projets React en production"],
  reasons: ["Même stack que votre poste", "Équipe produit"],
  verdict: "seize" as const,
  watchouts: [],
}

describe("AlertAnalysis (US-168)", () => {
  it("shows the verdict, the reasons and what to bring forward, in its own box", () => {
    const html = renderToStaticMarkup(<AlertAnalysis analysis={analysis} />)

    expect(html).toContain("Analyse IA")
    expect(html).toContain("À saisir")
    expect(html).toContain("Pourquoi elle vaut le coup")
    expect(html).toContain("Même stack que votre poste")
    expect(html).toContain("À mettre en avant dans le CV et la lettre")
    // An empty section is left out rather than shown blank.
    expect(html).not.toContain("Points de vigilance")
  })

  it("names each verdict on the card", () => {
    expect(
      renderToStaticMarkup(
        <AlertVerdictBadge analysis={{ ...analysis, verdict: "skip" }} />
      )
    ).toContain("À passer")
  })
})
