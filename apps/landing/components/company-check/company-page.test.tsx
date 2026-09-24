import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { PublicCompanyPage } from "@cvforge/types"

import {
  CompanyPage,
  companyPageSummary,
} from "@/components/company-check/company-page"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { companyPageStructuredData } from "@/lib/structured-data"

const PAGE: PublicCompanyPage = {
  company: {
    category: "GE",
    closed: false,
    createdOn: "1991-04-02",
    egapro: { score: 94, year: "2025" },
    employerPage: {
      edited: true,
      offers: 8,
      url: "https://recrute.francetravail.fr/page-employeur/everience-913",
    },
    ess: false,
    finances: { netIncome: 20_941_726, revenue: 211_086_627, year: "2025" },
    gesReport: true,
    headcountBand: "51",
    inclusive: false,
    legalName: "EVERIENCE",
    mission: false,
    nafCode: "62.03Z",
    nafSection: "J",
    openEstablishments: 6,
    siren: "381983568",
  },
  hiring: [
    {
      city: "Nantes",
      department: "44",
      departmentLabel: "Loire-Atlantique",
      hasMarketPage: true,
      romeCode: "M1855",
      romeLabel: "Développeur / Développeuse web",
    },
    {
      city: "Rennes",
      department: "35",
      departmentLabel: "Ille-et-Vilaine",
      hasMarketPage: false,
      romeCode: "M1855",
      romeLabel: "Développeur / Développeuse web",
    },
  ],
  name: "EVERIENCE",
  refreshedAt: "2026-09-20T08:00:00.000Z",
  sameSector: [{ name: "SOPRA STERIA GROUP", siren: "326820065" }],
  siren: "381983568",
}

const PATH = "/fr/verifier-employeur/everience-381983568"
const CRUMBS = [
  { name: "Outils gratuits", path: "/fr/outils" },
  { name: "Vérifier un employeur", path: "/fr/verifier-employeur" },
  { name: "EVERIENCE : fiche employeur", path: PATH },
]

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

function render(page = PAGE, dict = fr, locale: "fr" | "en" = "fr") {
  return renderToStaticMarkup(
    <CompanyPage
      crumbs={CRUMBS}
      dictionary={dict.companyCheck}
      errors={dict.ats}
      locale={locale}
      page={page}
      toolPath="/fr/verifier-employeur"
    />
  )
}

describe("CompanyPage", () => {
  it("has one title naming the company, its SIREN and a sentence from the record", () => {
    const html = render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain("EVERIENCE : fiche employeur")
    expect(html).toContain("SIREN 381 983 568 · Grande entreprise")
    expect(html).toContain(
      "Secteur : Information et communication (NAF 62.03Z). Effectif : 2 000 à 4 999 salariés. Créée en 1991."
    )
  })

  it("marks the current page in the breadcrumb, sections under H2s", () => {
    const html = render()

    expect(html).toContain('<nav aria-label="Fil d&#x27;Ariane">')
    expect(html).toContain('href="/fr/outils"')
    expect(html).toMatch(
      /aria-current="page"[^>]*>EVERIENCE : fiche employeur</
    )
    expect(html).toMatch(
      /<h2[^>]*id="company-sheet"[^>]*>La fiche de l&#x27;entreprise<\/h2>/
    )
    // The sheet's blocks stay below the section's H2.
    expect(html).toContain("<h3")
  })

  it("cites its sources and the date the record was read", () => {
    const html = render()

    expect(html).toContain(escapeHtml(fr.companyCheck.sheet.sources.annuaire))
    expect(html).toContain(escapeHtml(fr.companyCheck.sheet.sources.egapro))
    expect(html).toContain(
      escapeHtml(fr.companyCheck.sheet.sources.employerPage)
    )
    expect(html).toContain(
      'href="https://annuaire-entreprises.data.gouv.fr/entreprise/381983568"'
    )
    expect(html).toContain(escapeHtml(fr.companyCheck.page.hiringSource))
    expect(html).toContain("Données relues le 20 septembre 2026.")
  })

  it("links where it hires only to pages that exist, and the same sector's companies", () => {
    const html = render()

    expect(html).toContain(
      'href="/fr/metier-recrute/developpeur-developpeuse-web-m1855/loire-atlantique-44"'
    )
    expect(html).toContain("Développeur / Développeuse web, Nantes (44)")
    expect(html).toContain(
      "<span>Développeur / Développeuse web, Rennes (35)</span>"
    )
    expect(html).not.toContain("ille-et-vilaine-35")
    expect(html).toContain(
      'href="/fr/verifier-employeur/sopra-steria-group-326820065"'
    )
    expect(html).toContain(escapeHtml(fr.companyCheck.cta.button))
  })

  it("leaves out empty sections", () => {
    const html = render({ ...PAGE, hiring: [], sameSector: [] })

    expect(html).not.toContain(escapeHtml(fr.companyCheck.page.hiringTitle))
    expect(html).not.toContain(escapeHtml(fr.companyCheck.page.sameSectorTitle))
  })

  it("speaks English on the English page", () => {
    const html = render(PAGE, en, "en")

    expect(html).toContain("EVERIENCE: employer profile")
    expect(html).toContain(
      "Sector: Information and communication (NAF 62.03Z)."
    )
  })
})

describe("companyPageSummary", () => {
  it("leaves out what the Annuaire does not publish, rather than say unknown", () => {
    const summary = companyPageSummary(
      {
        ...PAGE,
        company: {
          ...PAGE.company,
          createdOn: null,
          headcountBand: "NN",
          nafSection: "",
        },
      },
      fr.companyCheck,
      "fr"
    )

    expect(summary).toBe("NAF 62.03Z.")
  })
})

describe("companyPageStructuredData", () => {
  it("gives the breadcrumb and the company as an organisation named by its SIREN", () => {
    const data = companyPageStructuredData({
      base: "https://cvspark.test",
      crumbs: CRUMBS,
      description: "Une phrase",
      locale: "fr",
      page: PAGE,
    })
    const [breadcrumb, webPage] = data["@graph"] as Array<
      Record<string, unknown>
    >

    expect(breadcrumb).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { item: "https://cvspark.test/fr/outils", position: 1 },
        { position: 2 },
        { item: `https://cvspark.test${PATH}`, position: 3 },
      ],
    })
    expect(webPage).toMatchObject({
      "@type": "WebPage",
      about: {
        "@type": "Organization",
        foundingDate: "1991-04-02",
        name: "EVERIENCE",
        sameAs: [
          "https://annuaire-entreprises.data.gouv.fr/entreprise/381983568",
          "https://recrute.francetravail.fr/page-employeur/everience-913",
        ],
        taxID: "381983568",
      },
      dateModified: PAGE.refreshedAt,
      url: `https://cvspark.test${PATH}`,
    })
  })
})
