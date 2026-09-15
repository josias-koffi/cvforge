import { describe, expect, it } from "vitest"

import { latestAiVersionId } from "./document-versions"

describe("latestAiVersionId", () => {
  it("skips manual saves and returns the newest AI version", () => {
    expect(
      latestAiVersionId([
        { id: "v3", source: "manual_save" },
        { id: "v2", source: "translation" },
        { id: "v1", source: "generation" },
      ])
    ).toBe("v2")
  })

  it("returns undefined without AI versions", () => {
    expect(latestAiVersionId([{ id: "v1", source: "manual_save" }])).toBeUndefined()
  })
})
