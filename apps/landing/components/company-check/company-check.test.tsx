import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { CompanyCheckSheet, PublicCompanyCheckResponse } from "@cvforge/types"

import { CompanyCheckTool } from "@/components/company-check/company-check-tool"
import { CompanyMatches } from "@/components/company-check/company-matches"
import { CompanySheet } from "@/components/company-check/company-sheet"
import { en } from "@/content/en"
import { fr } from "@/content/fr"

const HELPLINE: CompanyCheckSheet = {
  category: "GE",
  closed: false,
  createdOn: "1991-03-01",
  egapro: { score: 94, year: "2025" },
  employerPage: {
    edited: true,
    offers: 8,
    url: "https://recrute.francetravail.fr/page-employeur/helpline-913",
  },
  ess: false,
  finances: { netIncome: 3_000_000, revenue: 211_100_000, year: "2025" },
  gesReport: true,
  headcountBand: "51",
  inclusive: false,
  legalName: "HELPLINE",
  mission: true,
  nafCode: "82.20Z",
  nafSection: "N",
  openEstablishments: 14,
  siren: "381983568",
}

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

function renderSheet(
  result: PublicCompanyCheckResponse,
  dict = fr,
  locale: "fr" | "en" = "fr"
) {
  return renderToStaticMarkup(
    <CompanySheet
      dictionary={dict.companyCheck}
      errors={dict.ats}
      locale={locale}
      onBack={null}
      onCtaClick={vi.fn()}
      onLeadSent={vi.fn()}
      onRestart={vi.fn()}
      result={result}
    />
  )
}

describe("CompanyCheckTool", () => {
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("asks for a name or a SIREN, labelled, in %s", (locale, dict) => {
    const html = renderToStaticMarkup(
      <CompanyCheckTool dictionary={dict.companyCheck} errors={dict.ats} locale={locale} />
    )
    const text = dict.companyCheck.form
    const input = html.match(/<input[^>]*>/)?.[0] ?? ""
    const id = input.match(/id="([^"]+)"/)?.[1]
    const hint = input.match(/aria-describedby="([^"]+)"/)?.[1]

    expect(html).toContain(`for="${id}">${escapeHtml(text.label)}<`)
    expect(html).toContain(`id="${hint}">${escapeHtml(text.hint)}<`)
    expect(html).toContain(escapeHtml(text.privacyNote))
    // The live region is there before anything is said in it.
    expect(html).toMatch(/aria-live="polite"[^>]*role="status"/)
    // Nothing typed yet: the button waits.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"|<button[^>]*type="submit"[^>]*disabled=""/)
  })
})

describe("CompanySheet", () => {
  it("shows the record, the commitments in words and the sources", () => {
    const html = renderSheet({ company: HELPLINE, status: "found" })
    const sheet = fr.companyCheck.sheet

    expect(html).toContain("SIREN 381 983 568 · Grande entreprise")
    expect(html).toContain("2 000 à 4 999 salariés")
    expect(html).toContain("Services administratifs et de soutien · NAF 82.20Z")
    expect(html).toContain("1 mars 1991")
    expect(html).toMatch(/211,1\s?M\s?€/)
    expect(html).toContain("94/100 en 2025")
    // Yes or no in words, not colour alone.
    expect(html).toContain(`${sheet.commitments.mission}</span><span class="font-medium">${sheet.yes}<`)
    expect(html).toContain(`${sheet.commitments.ess}</span><span class="text-muted-foreground">${sheet.no}<`)
    expect(html).toContain(
      'href="https://recrute.francetravail.fr/page-employeur/helpline-913"'
    )
    expect(html).toContain("8 offres publiées")
    expect(html).toContain(sheet.newTab)
    expect(html).toContain(
      'href="https://annuaire-entreprises.data.gouv.fr/entreprise/381983568"'
    )
    expect(html).toContain(escapeHtml(sheet.sources.egapro))
    expect(html).toContain(sheet.sources.employerPage)
    expect(html).toContain(escapeHtml(fr.companyCheck.cta.button))
    expect(html).not.toContain(sheet.closed)
  })

  it("says what is missing, and cites only the sources it read", () => {
    const html = renderSheet({
      company: {
        ...HELPLINE,
        category: null,
        closed: true,
        createdOn: null,
        egapro: null,
        employerPage: null,
        finances: null,
        headcountBand: "NN",
      },
      status: "found",
    })
    const sheet = fr.companyCheck.sheet

    expect(html).toContain(sheet.closed)
    expect(html).toContain(sheet.missing)
    expect(html).toContain(sheet.egaproMissing)
    expect(html).toContain(sheet.employerPageMissing)
    expect(html).not.toContain(escapeHtml(sheet.sources.egapro))
    expect(html).not.toContain(sheet.sources.employerPage)
  })

  it("words an unknown company plainly, without a call to action", () => {
    const html = renderSheet({ status: "unknown" })

    expect(html).toContain(fr.companyCheck.unknown.title)
    expect(html).not.toContain(escapeHtml(fr.companyCheck.cta.button))
  })

  it("speaks English on the English page", () => {
    const html = renderSheet({ company: HELPLINE, status: "found" }, en, "en")

    expect(html).toContain("2,000–4,999 employees")
    expect(html).toContain("March 1, 1991")
    expect(html).toContain("€211.1M")
    expect(html).toContain("94/100 in 2025")
  })
})

describe("CompanyMatches", () => {
  it("tells namesakes apart by town, NAF code and headcount", () => {
    const html = renderToStaticMarkup(
      <CompanyMatches
        dictionary={fr.companyCheck.results}
        disabled={false}
        locale="fr"
        matches={[
          {
            city: "COURBEVOIE",
            closed: false,
            headcountBand: "51",
            nafCode: "82.20Z",
            name: "HELPLINE",
            postcode: "92400",
            siren: "381983568",
          },
          {
            city: "",
            closed: true,
            headcountBand: "",
            nafCode: "",
            name: "HELPLINE OUEST",
            postcode: "",
            siren: "552100554",
          },
        ]}
        onOpen={vi.fn()}
      />
    )

    expect(html).toContain("2 entreprises correspondent")
    expect(html).toContain(
      "COURBEVOIE (92400) · NAF 82.20Z · 2 000 à 4 999 salariés"
    )
    expect(html).toContain(fr.companyCheck.results.closed)
    expect(html.match(/<button[^>]*type="button"/g)).toHaveLength(2)
  })
})
