import type { HiringCompaniesView, HiringCompany } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/entreprises/actions", () => ({
  applySpontaneously: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const { HiringCompanies } =
  await import("@/components/job-search/hiring-companies")

const EVERIENCE: HiringCompany = {
  badges: [],
  city: "Nantes",
  headcountMax: 199,
  headcountMin: 100,
  highPotential: true,
  hiringPotential: 25.7,
  logoUrl: null,
  nafLabel: "Conseil en systèmes et logiciels informatiques",
  name: "EVERIENCE",
  postcode: "44000",
  romeCode: "M1805",
  romeLabel: "Développeur / Développeuse informatique",
  siret: "38198356800092",
}

function render(view: HiringCompaniesView) {
  return renderToStaticMarkup(
    <HiringCompanies profileId="p1" view={view} />
  ).replace(/&#x27;/g, "'")
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
    // One fact per line, each with its icon, as on the offer cards.
    expect(html).toContain("Nantes")
    expect(html).toContain("100 à 199 salariés")
    expect(html).not.toContain("Nantes · ")
    expect(html).toContain(
      "Recrute dans : Développeur / Développeuse informatique"
    )
    // The badge only for La Bonne Boîte's high potential.
    expect(html.match(/Fort potentiel/g)).toHaveLength(1)
  })

  it("offers a spontaneous application on every company, free to create (US-120)", () => {
    const html = render({
      companies: [EVERIENCE],
      refreshedAt: "2026-09-24T10:00:00.000Z",
      status: "ready",
    })

    expect(html).toContain("Candidature spontanée chez EVERIENCE")
    expect(html).toContain("gratuite à créer")
    expect(html).toContain("crédits habituels")
  })

  it("links each company to its page, and shows its commitments (US-121)", () => {
    const html = render({
      companies: [
        {
          ...EVERIENCE,
          badges: [
            { key: "egapro", label: "Index égalité F/H : 94/100 (2025)" },
          ],
        },
      ],
      refreshedAt: "2026-09-24T10:00:00.000Z",
      status: "ready",
    })

    expect(html).toContain('href="/entreprises/38198356800092?profileId=p1"')
    // The whole card opens it, and says so to a screen reader.
    expect(html).toContain("Voir la fiche de EVERIENCE")
    expect(html).toContain("Index égalité F/H : 94/100 (2025)")
    // With its icon, as on the company's page.
    expect(html).toContain("lucide-scale")
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

  it("cuts a long list into pages, keeping the profile in the links", () => {
    const companies = Array.from({ length: 50 }, (_, index) => ({
      ...EVERIENCE,
      name: `SOCIETE ${index + 1}`,
      siret: String(38198356800000 + index),
    }))
    const view = (page?: number) =>
      renderToStaticMarkup(
        <HiringCompanies
          profileId="p1"
          page={page}
          view={{ companies, refreshedAt: null, status: "ready" }}
        />
      )

    const first = view()
    expect(first).toContain("50 entreprises susceptibles")
    expect(first).toContain("SOCIETE 24<")
    expect(first).not.toContain("SOCIETE 25<")
    expect(first).toContain('href="/entreprises?profileId=p1&amp;page=2"')
    expect(first).toContain("1 à 24 sur 50")

    // Past the end, the last page rather than an empty one.
    const last = view(9)
    expect(last).toContain("SOCIETE 50<")
    expect(last).not.toContain("SOCIETE 48<")
    expect(last).toContain("49 à 50 sur 50")
  })

  it("shows no pagination for a list that fits on one page", () => {
    const html = render({
      companies: [EVERIENCE],
      refreshedAt: null,
      status: "ready",
    })

    expect(html).not.toContain("Suivante")
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
