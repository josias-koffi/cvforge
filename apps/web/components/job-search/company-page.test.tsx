import type { HiringCompanyDetail } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CompanyCommitments } from "@/components/job-search/company-commitments"
import { keyFigures } from "@/components/job-search/company-key-figures"
import { CompanyProfileView } from "@/components/job-search/company-profile"

const COMPANY: HiringCompanyDetail["company"] = {
  badges: [],
  city: "Villeneuve-d'Ascq",
  headcountMax: 1999,
  headcountMin: 1000,
  highPotential: false,
  hiringPotential: 3.2,
  logoUrl: null,
  nafLabel: "Conseil en systèmes et logiciels informatiques",
  name: "OPEN",
  postcode: "59491",
  romeCode: "M1855",
  romeLabel: "Développeur / Développeuse web",
  siret: "38103128500574",
}

const PROFILE: NonNullable<HiringCompanyDetail["profile"]> = {
  badges: [],
  category: "ETI",
  closed: false,
  createdOn: "1991-01-21",
  employerPage: null,
  finances: { netIncome: -2_500_000, revenue: 369_900_000, year: "2025" },
  headcountLabel: "2 000 à 4 999 salariés",
  legalName: "OPEN",
  openEstablishments: 12,
  refreshedAt: "2026-09-24T10:00:00.000Z",
  siren: "381031285",
}

const text = (html: string) =>
  html.replace(/&#x27;/g, "'").replace(/[  ]/g, " ")

describe("keyFigures", () => {
  it("shows the figures we hold, the loss as a loss", () => {
    const figures = keyFigures(COMPANY, PROFILE)
    const byLabel = Object.fromEntries(figures.map((f) => [f.label, f]))

    expect(text(byLabel["Effectif de l'établissement"]!.value)).toBe(
      "1 000 à 1 999 salariés"
    )
    expect(byLabel["Effectif de l'entreprise"]!.hint).toBe(
      "12 établissements ouverts"
    )
    expect(byLabel["Résultat net 2025"]!.hint).toBe("Déficitaire")
    expect(byLabel["Résultat net 2025"]!.tone).toBe("text-destructive")
    expect(byLabel["Créée en"]!.value).toBe("1991")
  })

  it("keeps to the establishment while the company is not read yet", () => {
    expect(keyFigures(COMPANY, null).map((f) => f.label)).toEqual([
      "Effectif de l'établissement",
    ])
    expect(
      keyFigures({ ...COMPANY, headcountMax: null, headcountMin: null }, null)
    ).toEqual([])
  })
})

describe("CompanyCommitments", () => {
  it("lists each commitment, and says so when there is none", () => {
    const html = text(
      renderToStaticMarkup(
        <CompanyCommitments
          badges={[
            { key: "ess", label: "Économie sociale et solidaire" },
            { key: "inclusive", label: "Entreprise inclusive" },
          ]}
        />
      )
    )

    expect(html).toContain("Économie sociale et solidaire")
    expect(html).toContain("lucide-hand-heart")
    expect(html).toContain("lucide-accessibility")
    expect(renderToStaticMarkup(<CompanyCommitments badges={[]} />)).toContain(
      "Aucun engagement public relevé"
    )
  })
})

describe("CompanyProfileView", () => {
  it("puts the application beside the job it hires for, with its cost", () => {
    const html = text(
      renderToStaticMarkup(
        <CompanyProfileView
          detail={{ company: COMPANY, profile: PROFILE }}
          action={<button type="button">Candidature spontanée</button>}
        />
      )
    )

    expect(html).toContain("Elle recrute")
    expect(html).toContain("Développeur / Développeuse web")
    expect(html).toContain("Candidature spontanée")
    expect(html).toContain("crédits habituels")
    expect(html).toContain("Entreprise de taille intermédiaire")
  })

  it("tells the company is closed before anything else", () => {
    const html = text(
      renderToStaticMarkup(
        <CompanyProfileView
          detail={{ company: COMPANY, profile: { ...PROFILE, closed: true } }}
        />
      )
    )

    expect(html.indexOf("Entreprise fermée")).toBeLessThan(
      html.indexOf("Effectif de l'établissement")
    )
  })
})
