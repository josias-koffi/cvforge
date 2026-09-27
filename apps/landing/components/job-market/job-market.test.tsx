import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { PublicJobMarketResponse } from "@cvforge/types"

import { JobMarketResult } from "@/components/job-market/job-market-result"
import { JobMarketTool } from "@/components/job-market/job-market-tool"
import { en } from "@/content/en"
import { fr } from "@/content/fr"

const READY: PublicJobMarketResponse = {
  appellation: {
    code: "38874",
    libelle: "Développeur / Développeuse web",
    metierCode: "M1855",
    metierLibelle: "Développement web",
  },
  department: "44",
  departmentLabel: "Loire-Atlantique",
  refreshedAt: "2026-09-20T08:00:00.000Z",
  salaryMinSample: 5,
  stats: {
    jobseekers: { period: "1er trimestre 2026", value: 330 },
    offers: { period: "1er trimestre 2026", value: 270 },
    offersYear: { period: "1er trimestre 2026", value: 1100 },
    salary: { medianYearly: 38_000, period: "offres vues depuis juin 2026", sample: 9 },
    tension: { period: "ANNEE 2025", value: 5 },
  },
  status: "ready",
}

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

function renderResult(result: PublicJobMarketResponse, dict = fr, locale = "fr") {
  return renderToStaticMarkup(
    <JobMarketResult
      dictionary={dict.jobMarket}
      errors={dict.ats}
      locale={locale}
      onCtaClick={vi.fn()}
      onLeadSent={vi.fn()}
      onRestart={vi.fn()}
      result={result}
    />
  )
}

describe("JobMarketTool", () => {
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("asks for a job and a department, in %s", (locale, dict) => {
    const html = renderToStaticMarkup(
      <JobMarketTool dictionary={dict.jobMarket} errors={dict.ats} locale={locale} />
    )

    expect(html).toContain(escapeHtml(dict.jobMarket.form.jobLabel))
    expect(html).toContain(escapeHtml(dict.jobMarket.form.departmentLabel))
    expect(html).toContain(escapeHtml(dict.jobMarket.form.privacyNote))
    // The department list renders when opened; closed, the field shows its
    // placeholder and is named by its label.
    const label = html.match(
      new RegExp(`<label[^>]*for="([^"]+)"[^>]*>${escapeHtml(dict.jobMarket.form.departmentLabel)}<`)
    )
    expect(label).not.toBeNull()
    expect(html).toMatch(new RegExp(`<button[^>]*id="${label![1]}"[^>]*role="combobox"|<button[^>]*role="combobox"[^>]*id="${label![1]}"`))
    expect(html).toContain(escapeHtml(dict.jobMarket.form.departmentPlaceholder))
    // Nothing picked yet: the button waits.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"|<button[^>]*type="submit"[^>]*disabled=""/)
  })

  it("exposes the job field as an ARIA combobox tied to its list and hint", () => {
    const html = renderToStaticMarkup(
      <JobMarketTool dictionary={fr.jobMarket} errors={fr.ats} locale="fr" />
    )
    const input = html.match(/<input[^>]*role="combobox"[^>]*>/)?.[0] ?? ""
    const listId = input.match(/aria-controls="([^"]+)"/)?.[1]
    const describedBy = input.match(/aria-describedby="([^"]+)"/)?.[1] ?? ""

    expect(input).toContain('aria-expanded="false"')
    expect(input).toContain('aria-autocomplete="list"')
    expect(html).toContain(`id="${listId}" role="listbox"`)
    for (const id of describedBy.split(" ")) {
      expect(html).toContain(`id="${id}"`)
    }
  })
})

describe("JobMarketResult", () => {
  it("shows the tension in words, the three figures and both sources", () => {
    const html = renderResult(READY)

    expect(html).toContain(escapeHtml(fr.jobMarket.result.tension.levels["5"]))
    expect(html).toContain("Niveau 5 sur 5")
    expect(html).toContain("270")
    expect(html).toMatch(/1[\s\u202f]100/)
    expect(html).toContain("330")
    expect(html).toMatch(/38[\s\u202f]000/)
    expect(html).toContain("d&#x27;après 9 offres")
    expect(html).toContain(fr.jobMarket.result.sources.market)
    expect(html).toContain(fr.jobMarket.result.sources.salary)
    expect(html).toContain("Chiffres du métier ROME M1855")
    expect(html).toContain('aria-live="polite"')
  })

  it("says why there is no salary below the minimum sample", () => {
    const html = renderResult({
      ...READY,
      stats: { ...READY.stats!, salary: null },
    })

    expect(html).toContain(
      escapeHtml(
        fr.jobMarket.result.salary.masked.replace("{min}", "5")
      )
    )
  })

  it("says the figures are being collected, and still offers the e-mail", () => {
    const html = renderResult({
      ...READY,
      refreshedAt: null,
      stats: null,
      status: "collecting",
    })

    expect(html).toContain(escapeHtml(fr.jobMarket.result.collecting.title))
    expect(html).toContain(escapeHtml(fr.jobMarket.cta.button))
    expect(html).toContain(fr.jobMarket.result.sources.market)
    expect(html).not.toContain("Chiffres lus le")
  })

  it("marks a figure France Travail did not publish", () => {
    const html = renderResult({
      ...READY,
      stats: { ...READY.stats!, jobseekers: null, tension: null },
    })

    expect(html.split(fr.jobMarket.result.missing)).toHaveLength(3)
  })

  it("speaks English on the English page", () => {
    const html = renderResult(READY, en, "en")

    expect(html).toContain("Level 5 of 5")
    expect(html).toContain(escapeHtml(en.jobMarket.cta.button))
    expect(html).toContain("€38,000")
  })
})
