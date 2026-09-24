import { describe, expect, it } from "vitest"

import { preselectedApplicationId } from "./preselection"

const APPLICATIONS = [{ id: "newest" }, { id: "older" }]

describe("preselectedApplicationId", () => {
  it("keeps an application id as it came", () => {
    expect(preselectedApplicationId("older", APPLICATIONS)).toBe("older")
  })

  it("resolves the magic link's 'recente' to the newest application", () => {
    expect(preselectedApplicationId("recente", APPLICATIONS)).toBe("newest")
  })

  it.each([
    ["no parameter", undefined, APPLICATIONS],
    ["a repeated parameter", ["a", "b"], APPLICATIONS],
    ["'recente' with no application", "recente", []],
  ])("preselects nothing for %s", (_label, candidature, applications) => {
    expect(preselectedApplicationId(candidature, applications)).toBeUndefined()
  })
})
