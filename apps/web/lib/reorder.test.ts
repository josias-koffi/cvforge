import { describe, expect, it } from "vitest"

import { datePatch, periodPatch } from "./date-patch"
import { moveItem } from "./reorder"

describe("moveItem", () => {
  it("moves an item and keeps the source untouched", () => {
    const source = ["a", "b", "c"]
    expect(moveItem(source, 0, 2)).toEqual(["b", "c", "a"])
    expect(source).toEqual(["a", "b", "c"])
  })

  it("ignores out of range or identical moves", () => {
    const source = ["a", "b"]
    expect(moveItem(source, 1, 1)).toBe(source)
    expect(moveItem(source, 0, 5)).toBe(source)
  })
})

describe("date patches", () => {
  it("rewrites the legacy year in the document language", () => {
    expect(datePatch({ key: "date", legacyKey: "year" }, "2022-03", "en")).toEqual({
      date: "2022-03",
      year: "Mar 2022",
    })
    expect(datePatch({ key: "date", legacyKey: "year" }, "", "fr")).toEqual({ date: "", year: "" })
  })

  const cv = {
    currentKey: "current",
    endKey: "end",
    legacyEndKey: "endDate",
    legacyStartKey: "startDate",
    startKey: "start",
  }

  it("builds start and end texts, with Present when ongoing", () => {
    const item = { start: "2020-01", end: "2021", startDate: "old" }
    expect(periodPatch(cv, item, { current: true }, "fr")).toMatchObject({
      current: true,
      end: "",
      startDate: "janvier 2020",
      endDate: "Présent",
    })
  })

  it("writes the whole period in the single legacy field for profiles", () => {
    const profile = { ...cv, legacyEndKey: undefined, legacyStartKey: "period" }
    expect(periodPatch(profile, {}, { start: "2019", end: "2021" }, "fr")).toMatchObject({
      period: "2019 – 2021",
    })
  })
})
