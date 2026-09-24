import type { HiringCompanyDetail } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CompanyProfileView } from "@/components/job-search/company-profile"

const DETAIL: HiringCompanyDetail = {
  company: {
    badges: [],
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
  },
  profile: {
    badges: [
      { key: "egapro", label: "Index égalité F/H : 94/100 (2025)" },
      { key: "ges", label: "Bilan carbone publié" },
    ],
    category: "GE",
    closed: false,
    createdOn: "1991-04-02",
    employerPage: {
      edited: true,
      offers: 8,
      url: "https://recrute.francetravail.fr/page-employeur/helpline-913",
    },
    finances: { netIncome: 20_941_726, revenue: 211_086_627, year: "2025" },
    headcountLabel: "2 000 à 4 999 salariés",
    legalName: "EVERIENCE",
    openEstablishments: 6,
    refreshedAt: "2026-09-24T10:00:00.000Z",
    siren: "381983568",
  },
}

function render(detail: HiringCompanyDetail) {
  return renderToStaticMarkup(<CompanyProfileView detail={detail} />)
    .replace(/&#x27;/g, "'")
    .replace(/ | /g, " ")
}

describe("CompanyProfileView", () => {
  it("shows the establishment and the company behind it", () => {
    const html = render(DETAIL)

    expect(html).toContain("44000 Nantes")
    expect(html).toContain("100 à 199 salariés")
    expect(html).toContain("Fort potentiel d'embauche")
    expect(html).toContain("Grande entreprise")
    expect(html).toContain("2 000 à 4 999 salariés")
    expect(html).toContain("Chiffre d'affaires 2025")
    expect(html).toContain("211,1 M €")
    expect(html).toContain("annuaire-entreprises.data.gouv.fr/entreprise/381983568")
  })

  it("names every source, Egapro when its index is shown", () => {
    const html = render(DETAIL)

    expect(html).toContain("Source : La Bonne Boîte, France Travail")
    expect(html).toContain("Source : Annuaire des entreprises")
    expect(html).toContain("ministère du Travail (Egapro)")
    expect(
      render({ ...DETAIL, profile: { ...DETAIL.profile!, badges: [] } })
    ).not.toContain("Egapro")
  })

  it("links the France Travail employer page, only when there is one (US-116)", () => {
    const html = render(DETAIL)

    expect(html).toContain(
      'href="https://recrute.francetravail.fr/page-employeur/helpline-913"'
    )
    expect(html).toContain("8 offres publiées · présentée par l'entreprise elle-même")
    expect(html).toContain("Page employeur : France Travail")
    expect(
      render({ ...DETAIL, profile: { ...DETAIL.profile!, employerPage: null } })
    ).not.toContain("page employeur")
  })

  it("says the company is still to be read, and when it is closed", () => {
    expect(render({ ...DETAIL, profile: null })).toContain("arrive dans l'heure")
    expect(
      render({ ...DETAIL, profile: { ...DETAIL.profile!, closed: true } })
    ).toContain("déclarée fermée")
  })
})
