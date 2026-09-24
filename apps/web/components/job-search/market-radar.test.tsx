import type { MarketDepartmentStats, MarketRadarEntry } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MarketRadar } from "@/components/job-search/market-radar"

const NANTES: MarketDepartmentStats = {
  department: "44",
  departmentLabel: "Loire-Atlantique",
  jobseekers: { period: "1er trimestre 2026", value: 150 },
  offers: { period: "1er trimestre 2026", value: 870 },
  offersYear: { period: "1er trimestre 2026", value: 2910 },
  salary: {
    medianYearly: 42_000,
    period: "offres vues depuis juin 2026",
    sample: 12,
  },
  tension: { period: "ANNEE 2025", value: 5 },
}

const ENTRY: MarketRadarEntry = {
  bestNeighbour: {
    ...NANTES,
    department: "85",
    departmentLabel: "Vendée",
    jobseekers: null,
    offersYear: { period: "1er trimestre 2026", value: 3200 },
    salary: null,
    tension: { period: "ANNEE 2025", value: 3 },
  },
  local: NANTES,
  refreshedAt: "2026-09-24T10:00:00.000Z",
  romeCode: "M1805",
  romeLabel: "Développeur / Développeuse informatique",
}

/** Intl writes thousands with a narrow no-break space; compare on plain text. */
function render(entries: MarketRadarEntry[]) {
  return renderToStaticMarkup(
    <MarketRadar entries={entries} profileId="p1" />
  ).replace(/ | /g, " ")
}

describe("MarketRadar", () => {
  it("says the job is in tension, with every figure's period", () => {
    const html = render([ENTRY])

    expect(html).toContain("Métier en tension dans votre département")
    expect(html).toContain("très élevée")
    expect(html).toContain("ANNEE 2025")
    expect(html).toContain("870 sur le trimestre")
    expect(html).toContain("2 910 sur douze mois")
    expect(html).toContain("1er trimestre 2026")
    expect(html).toContain("Salaire médian observé")
    expect(html).toContain("42 000 € par an")
    expect(html).toContain("12 offres, offres vues depuis juin 2026")
  })

  it("names the region's most promising department", () => {
    const html = render([ENTRY])

    expect(html).toContain("Plus porteur dans votre région")
    expect(html).toContain("Vendée")
    expect(html).toContain(
      "3 200 offres sur douze mois, difficulté à recruter moyenne"
    )
  })

  it("names both sources, the salary's own included", () => {
    const html = render([ENTRY])

    expect(html).toContain("Source : Marché du travail, France Travail")
    expect(html).toContain("Salaires : offres collectées par CVSpark")
    expect(
      render([{ ...ENTRY, local: { ...NANTES, salary: null } }])
    ).not.toContain("offres collectées par CVSpark")
  })

  it("claims no tension below the high levels, and shows no figure it lacks", () => {
    const html = render([
      {
        ...ENTRY,
        bestNeighbour: null,
        local: {
          ...NANTES,
          jobseekers: null,
          tension: { period: "ANNEE 2025", value: 3 },
        },
      },
    ])

    expect(html).not.toContain("Métier en tension")
    expect(html).not.toContain("Demandeurs")
    expect(html).not.toContain("Plus porteur")
  })

  it("gives one card per job, its departments inside", () => {
    const html = render([
      ENTRY,
      {
        ...ENTRY,
        bestNeighbour: null,
        local: {
          ...NANTES,
          department: "49",
          departmentLabel: "Maine-et-Loire",
        },
      },
    ])

    expect(html.split("Développeur / Développeuse informatique")).toHaveLength(
      2
    )
    expect(html).toContain("Loire-Atlantique")
    expect(html).toContain("Maine-et-Loire")
  })

  it("explains what to do before the first figures", () => {
    const html = render([])

    expect(html).toContain("Confirmez un métier")
    expect(html).toContain('href="/ma-recherche/metiers?profileId=p1"')
    expect(html).not.toContain("Source :")
  })
})
