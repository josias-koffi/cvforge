import type { HiringCompaniesView, HiringCompany } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { HiringCompanies } from "@/components/job-search/hiring-companies"

const EVERIENCE: HiringCompany = {
  city: "Nantes",
  headcountMax: 199,
  headcountMin: 100,
  highPotential: true,
  hiringPotential: 25.7,
  nafLabel: "Conseil en systèmes et logiciels informatiques",
  name: "EVERIENCE",
  postcode: "44000",
  romeCode: "M1805",
  romeLabel: "Développeur / Développeuse informatique",
  siret: "38198356800092",
}

function render(view: HiringCompaniesView) {
  return renderToStaticMarkup(<HiringCompanies view={view} />).replace(
    /&#x27;/g,
    "'"
  )
}

describe("HiringCompanies", () => {
  it("shows each company with its sector, city, headcount and job", () => {
    const html = render({
      companies: [
        EVERIENCE,
        {
          ...EVERIENCE,
          headcountMax: null,
          headcountMin: null,
          highPotential: false,
          name: "CGI FRANCE",
          siret: "70204275500844",
        },
      ],
      refreshedAt: "2026-09-24T10:00:00.000Z",
      status: "ready",
    })

    expect(html).toContain("2 entreprises susceptibles")
    expect(html).toContain("EVERIENCE")
    expect(html).toContain("Conseil en systèmes et logiciels informatiques")
    expect(html).toContain("Nantes · 100 à 199 salariés")
    expect(html).toContain("Recrute dans : Développeur / Développeuse informatique")
    // The badge only for La Bonne Boîte's high potential.
    expect(html.match(/Fort potentiel/g)).toHaveLength(1)
  })

  it("credits La Bonne Boîte with the reading date, and says it is free", () => {
    const html = render({
      companies: [EVERIENCE],
      refreshedAt: "2026-09-24T10:00:00.000Z",
      status: "ready",
    })

    expect(html).toContain(
      "Source : La Bonne Boîte, France Travail, lu le 24 septembre. Gratuit."
    )
  })

  it("says what to do when there is nothing to show yet", () => {
    const view = (status: HiringCompaniesView["status"]) =>
      render({ companies: [], refreshedAt: null, status })

    expect(view("no_rome")).toContain("Confirmez au moins un métier")
    expect(view("no_location")).toContain("Ajoutez une ville")
    expect(view("pending")).toContain("arrive dans l'heure")
    expect(view("pending")).not.toContain("Ma recherche")
    expect(view("ready")).toContain("Élargissez le rayon")
  })
})
