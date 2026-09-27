import { describe, expect, it } from "vitest"

import { pageHref, paginationSlots } from "@/lib/pagination"

describe("paginationSlots", () => {
  it("writes out every page when they all fit", () => {
    expect(paginationSlots(1, 4)).toEqual([1, 2, 3, 4])
  })

  it("collapses the far pages around the current one", () => {
    expect(paginationSlots(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20])
  })

  it("never hides a single page behind an ellipsis", () => {
    // 1 … 3 4 5 … would cost a click to reach page 2, which is absurd.
    expect(paginationSlots(4, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20])
  })

  it("keeps the window inside the range at both ends", () => {
    expect(paginationSlots(1, 20)).toEqual([1, 2, "ellipsis", 20])
    expect(paginationSlots(20, 20)).toEqual([1, "ellipsis", 19, 20])
  })

  it("survives a page number out of range", () => {
    expect(paginationSlots(99, 3)).toEqual([1, 2, 3])
    expect(paginationSlots(0, 1)).toEqual([1])
  })
})

describe("pageHref", () => {
  it("carries the criteria over and drops the empty ones", () => {
    expect(pageHref("/offres", { contrat: "", q: "react" }, 3)).toBe(
      "/offres?q=react&page=3"
    )
  })

  it("leaves the first page without a page number", () => {
    expect(pageHref("/offres", { q: "react" }, 1)).toBe("/offres?q=react")
    expect(pageHref("/offres", {}, 1)).toBe("/offres")
  })

  it("keeps a parameter it knows nothing about", () => {
    // The open offer, the sort order, whatever comes next: enumerating the
    // known filters would erase them silently.
    expect(pageHref("/offres", { tri: "date" }, 2)).toBe("/offres?tri=date&page=2")
  })

  it("ignores the incoming page number", () => {
    expect(pageHref("/offres", { page: "7" }, 2)).toBe("/offres?page=2")
  })
})
