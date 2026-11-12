import { describe, expect, it } from "vitest"

import {
  activeFilters,
  clearedFilters,
  offerSearchHref,
  toggleContract,
  withFilters,
} from "@/lib/offer-search"

describe("offerSearchHref", () => {
  it("is the bare page with no criteria", () => {
    expect(offerSearchHref({})).toBe("/offres")
  })

  it("writes the criteria in one order, empty ones dropped", () => {
    expect(
      offerSearchHref({
        tri: "recent",
        q: " react ",
        departement: "",
        page: "1",
      })
    ).toBe("/offres?q=react&tri=recent")
  })

  it("keeps a page beyond the first", () => {
    expect(offerSearchHref({ q: "react", page: "3" })).toBe(
      "/offres?q=react&page=3"
    )
  })
})

describe("withFilters", () => {
  it("goes back to the first page when a criterion changes", () => {
    expect(
      withFilters({ q: "react", page: "4" }, { teletravail: "1" })
    ).toEqual({ q: "react", teletravail: "1" })
  })

  it("keeps the page asked for", () => {
    expect(withFilters({ q: "react" }, { page: "2" })).toEqual({
      page: "2",
      q: "react",
    })
  })
})

describe("toggleContract", () => {
  it("adds then removes a contract", () => {
    const ticked = toggleContract({ contrat: "cdi" }, "cdd")

    expect(ticked.contrat).toBe("cdi,cdd")
    expect(toggleContract(ticked, "cdi").contrat).toBe("cdd")
    expect(toggleContract({ contrat: "cdi" }, "cdi").contrat).toBeUndefined()
  })
})

describe("activeFilters", () => {
  const filters = {
    contrat: "cdi,alternance",
    departement: "44",
    publiee: "3",
    q: "react",
    teletravail: "1",
    tri: "recent",
  }

  it("names every criterion narrowing the search, not the sort", () => {
    expect(activeFilters(filters).map((chip) => chip.label)).toEqual([
      "« react »",
      "Département 44",
      "CDI",
      "Alternance",
      "Télétravail",
      "Moins de 3 jours",
    ])
  })

  it("removes only its own criterion", () => {
    const cdi = activeFilters(filters).find((chip) => chip.id === "contrat-cdi")

    expect(cdi?.without).toEqual({ ...filters, contrat: "alternance" })
  })

  it("clears everything but the sort", () => {
    expect(clearedFilters(filters)).toEqual({ tri: "recent" })
  })
})

describe("around a city", () => {
  it("writes the city right after the words", () => {
    expect(offerSearchHref({ rayon: "30", ville: "44109", q: "react" })).toBe(
      "/offres?q=react&ville=44109&rayon=30"
    )
  })

  it("drops the radius with the city", () => {
    expect(
      withFilters({ rayon: "30", ville: "44109" }, { ville: undefined })
    ).toEqual({})
  })

  it("names the city and its radius in the chip", () => {
    const [chip] = activeFilters({ ville: "44109" }, "Nantes")

    expect(chip?.label).toBe("Nantes · 20 km")
    expect(chip?.without).toEqual({})
  })
})
