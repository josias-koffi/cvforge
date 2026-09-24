import { emptySearchProject, type SearchProject } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  companiesSummary,
  jobSummary,
  placeSummary,
  sameCriteria,
} from "@/components/job-search/search-criteria"

const PROJECT: SearchProject = {
  ...emptySearchProject("p1"),
  contractTypes: ["cdi", "freelance"],
  locations: [
    {
      department: "69",
      inseeCode: "69123",
      label: "Lyon",
      latitude: null,
      longitude: null,
      radiusKm: 30,
    },
  ],
  remote: "hybrid",
  sectors: ["immobilier"],
  targetRoles: ["Développeur", "Ingénieur logiciel"],
}

describe("sameCriteria", () => {
  it("ignores the save date the server stamps", () => {
    expect(
      sameCriteria(PROJECT, { ...PROJECT, updatedAt: "2026-09-24T10:00:00Z" })
    ).toBe(true)
  })

  it("sees any other change", () => {
    expect(sameCriteria(PROJECT, { ...PROJECT, remote: "onsite" })).toBe(false)
    expect(
      sameCriteria(PROJECT, { ...PROJECT, targetRoles: ["Développeur"] })
    ).toBe(false)
  })
})

describe("summaries", () => {
  it("sums up the job, the place and the filters", () => {
    expect(jobSummary(PROJECT)).toBe("2 postes · CDI · Freelance")
    expect(placeSummary(PROJECT)).toBe("Lyon + 30 km · Hybride")
    expect(companiesSummary(PROJECT)).toBe("1 filtre")
  })

  it("says what is missing on an empty search", () => {
    const empty = emptySearchProject("p1")

    expect(jobSummary(empty)).toBe("Aucun poste renseigné")
    expect(placeSummary(empty)).toBe("Aucune ville")
    expect(companiesSummary(empty)).toBe("Aucun filtre")
  })

  it("names national mobility instead of the cities", () => {
    expect(placeSummary({ ...PROJECT, nationalMobility: true })).toBe(
      "Toute la France · Hybride"
    )
  })
})
