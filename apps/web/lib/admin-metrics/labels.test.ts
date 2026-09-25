import { acquisitionTools, aiFeatures } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  acquisitionToolLabels,
  aiFeatureLabels,
  creditActionLabel,
} from "@/lib/admin-metrics/labels"

describe("labels", () => {
  it("names every AI feature and every free tool", () => {
    for (const feature of aiFeatures)
      expect(aiFeatureLabels[feature]).toBeTruthy()
    for (const tool of acquisitionTools) {
      expect(acquisitionToolLabels[tool]).toBeTruthy()
    }
  })

  it("names a known billed action, and shows an unknown one as is", () => {
    expect(creditActionLabel("cv_generation")).toBe("CV généré")
    expect(creditActionLabel("new_thing")).toBe("new_thing")
  })
})
