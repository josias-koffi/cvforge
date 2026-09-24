import type { SearchProjectRomeAppellation } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/ma-recherche/actions", () => ({
  decideRomeAppellation: vi.fn(),
  findRomeAppellations: vi.fn(),
}))

const { RomeAppellationLists, SearchProjectRome } =
  await import("@/components/job-search/search-project-rome")

const WEB: SearchProjectRomeAppellation = {
  code: "38976",
  libelle: "Développeur / Développeuse full-stack",
  metierCode: "M1855",
  metierLibelle: "Développeur / Développeuse web",
  score: null,
  status: "confirmed",
}
const BACK: SearchProjectRomeAppellation = {
  ...WEB,
  code: "200151",
  libelle: "Développeur / Développeuse back-end",
  score: 0.671,
  status: "suggested",
}

function renderLists(appellations: SearchProjectRomeAppellation[]) {
  return renderToStaticMarkup(
    <RomeAppellationLists
      appellations={appellations}
      criteriaHref="/ma-recherche?profileId=p1"
      disabled={false}
      onDecide={() => {}}
    />
  )
}

describe("RomeAppellationLists", () => {
  it("sends to the criteria while nothing was suggested", () => {
    const html = renderLists([])

    expect(html).toContain("Aucun métier")
    expect(html).toContain('href="/ma-recherche?profileId=p1"')
  })

  it("puts the suggestions to sort before the confirmed jobs", () => {
    const html = renderLists([WEB, BACK])

    expect(html.indexOf("À trier (1)")).toBeLessThan(html.indexOf("Confirmés"))
  })

  it("shows confirmed jobs apart from suggestions, with their confidence", () => {
    const html = renderLists([WEB, BACK])

    expect(html).toContain("Confirmés")
    expect(html).toContain("À trier")
    expect(html).toContain("67 %")
    expect(html).toContain(
      'aria-label="Retirer Développeur / Développeuse full-stack"'
    )
    expect(html).toContain(
      'aria-label="Confirmer Développeur / Développeuse back-end"'
    )
    expect(html).toContain(
      'aria-label="Écarter Développeur / Développeuse back-end"'
    )
    expect(html).toContain('title="Métier : Développeur / Développeuse web"')
  })

  it("leaves out a section that has nothing in it", () => {
    expect(renderLists([BACK])).not.toContain("Confirmés")
    expect(renderLists([WEB])).not.toContain("À trier")
  })
})

describe("SearchProjectRome", () => {
  it("cites France Travail, as the licence asks", () => {
    const html = renderToStaticMarkup(
      <SearchProjectRome profileId="p1" initialAppellations={[WEB]} />
    )

    expect(html).toContain("Vos métiers")
    expect(html).toContain("Source : ROME 4.0, France Travail")
    expect(html).toContain("Ajouter un métier")
  })
})
