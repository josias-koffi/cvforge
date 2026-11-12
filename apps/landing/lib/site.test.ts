import { describe, expect, it } from "vitest"

import { isIndexable } from "@/lib/site"

describe("isIndexable", () => {
  it("is true in production only", () => {
    expect(isIndexable({ DEPLOY_ENV: "production" })).toBe(true)
    for (const value of ["staging", "", " ", "Production", undefined]) {
      expect(isIndexable({ DEPLOY_ENV: value })).toBe(false)
    }
  })
})
