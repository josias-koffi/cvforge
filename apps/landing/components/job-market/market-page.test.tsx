import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { PublicMarketPage } from "@cvforge/types"

import { MarketPage, marketPageSummary } from "@/components/job-market/market-page"
import { en } from "@/content/en"
import { fr } from "@/content/fr"
import { marketPageStructuredData } from "@/lib/structured-data"

const PAGE: PublicMarketPage = {
  appellations: [
    { code: "12786", libelle: "Comptable", metierCode: "M1203", metierLibelle: "Comptable" },
    { code: "12807", libelle: "Comptable unique", metierCode: "M1203", metierLibelle: "Comptable" },
  ],
  department: "44",
  departmentLabel: "Loire-Atlantique",
  leadAppellationCode: "12786",
  neighbours: [
    { department: "49", departmentLabel: "Maine-et-Loire", romeCode: "M1203", romeLabel: "Comptable" },
  ],
  otherJobs: [
    { department: "44", departmentLabel: "Loire-Atlantique", romeCode: "D1102", romeLabel: "Boulanger / Boulangère" },
  ],
  refreshedAt: "2026-09-20T08:00:00.000Z",
  romeCode: "M1203",
  romeLabel: "Comptable",
  salaryMinSample: 5,
  stats: {
    jobseekers: { period: "1er trimestre 2026", value: 220 },
    offers: { period: "1er trimestre 2026", value: 1480 },
    offersYear: { period: "1er trimestre 2026", value: 6770 },
    salary: null,
    tension: { period: "ANNEE 2025", value: 5 },
  },
}

const CRUMBS = [
  { name: "Outils gratuits", path: "/fr/outils" },
  { name: "Ce métier recrute-t-il ?", path: "/fr/metier-recrute" },
  { name: "Comptable, Loire-Atlantique (44)", path: "/fr/metier-recrute/comptable-m1203/loire-atlantique-44" },
]

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

function render(page = PAGE, dict = fr, locale: "fr" | "en" = "fr") {
  return renderToStaticMarkup(
    <MarketPage
      crumbs={CRUMBS}
      dictionary={dict.jobMarket}
      errors={dict.ats}
      locale={locale}
      page={page}
      toolPath="/fr/metier-recrute"
    />
  )
}

describe("MarketPage", () => {
  it("has one title naming the job and the department, and a sentence from the figures", () => {
    const html = render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain("Comptable, Loire-Atlantique (44) : le métier recrute-t-il ?")
    expect(html).toContain("niveau 5 sur 5")
    expect(html).toMatch(/6[\s ]770 offres/)
    expect(html).toContain("220 demandeurs")
  })

  it("marks the current page in the breadcrumb and links the others", () => {
    const html = render()

    expect(html).toContain('<nav aria-label="Fil d&#x27;Ariane">')
    expect(html).toContain('href="/fr/outils"')
    expect(html).toMatch(/aria-current="page"[^>]*>Comptable, Loire-Atlantique \(44\)</)
  })

  it("cites both sources, and links the pages around it", () => {
    const html = render()

    expect(html).toContain(fr.jobMarket.result.sources.market)
    expect(html).toContain(fr.jobMarket.result.sources.salary)
    expect(html).toContain('href="/fr/metier-recrute/comptable-m1203/maine-et-loire-49"')
    expect(html).toContain('href="/fr/metier-recrute/boulanger-boulangere-d1102/loire-atlantique-44"')
    expect(html).toContain("Comptable unique")
    expect(html).toContain(escapeHtml(fr.jobMarket.cta.button))
  })

  it("leaves out empty link lists and the CTA without an appellation", () => {
    const html = render({ ...PAGE, leadAppellationCode: null, neighbours: [], otherJobs: [] })

    expect(html).not.toContain(escapeHtml(fr.jobMarket.page.neighboursTitle))
    expect(html).not.toContain(escapeHtml(fr.jobMarket.page.otherJobsTitle))
    expect(html).not.toContain(escapeHtml(fr.jobMarket.cta.button))
  })

  it("speaks English on the English page", () => {
    const html = render(PAGE, en, "en")

    expect(html).toContain("Comptable, Loire-Atlantique (44): is this job hiring?")
    expect(html).toContain("level 5 of 5")
  })
})

describe("marketPageSummary", () => {
  it("stops before the job seekers when there are none, rather than say 0", () => {
    const summary = marketPageSummary(
      { ...PAGE, stats: { ...PAGE.stats, jobseekers: null } },
      fr.jobMarket.page,
      "fr"
    )

    expect(summary).not.toContain("demandeurs")
    expect(summary).toContain("ANNEE 2025")
  })
})

describe("marketPageStructuredData", () => {
  it("gives the breadcrumb and a dataset whose creator is France Travail", () => {
    const data = marketPageStructuredData({
      base: "https://cvspark.test",
      crumbs: CRUMBS,
      description: "Une phrase",
      locale: "fr",
      page: PAGE,
      title: "Comptable, Loire-Atlantique (44)",
    })
    const [breadcrumb, dataset] = data["@graph"] as Array<Record<string, unknown>>

    expect(breadcrumb).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { item: "https://cvspark.test/fr/outils", position: 1 },
        { position: 2 },
        {
          item: "https://cvspark.test/fr/metier-recrute/comptable-m1203/loire-atlantique-44",
          position: 3,
        },
      ],
    })
    expect(dataset).toMatchObject({
      "@type": "Dataset",
      creator: { name: "France Travail" },
      dateModified: PAGE.refreshedAt,
      url: "https://cvspark.test/fr/metier-recrute/comptable-m1203/loire-atlantique-44",
    })
  })
})
