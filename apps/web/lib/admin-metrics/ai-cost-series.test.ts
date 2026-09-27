import { describe, expect, it } from "vitest"

import {
  featureCostChart,
  MAX_CHARTED_FEATURES,
  REST_KEY,
} from "@/lib/admin-metrics/ai-cost-series"

describe("featureCostChart", () => {
  it("charts only the features present, costliest first", () => {
    const chart = featureCostChart([
      { cv_import: 0.1, cv_generation: 0.5, date: "2026-09-24" },
      { cv_generation: 0.5, date: "2026-09-25" },
    ])

    expect(chart.keys).toEqual(["cv_generation", "cv_import"])
    expect(chart.config.cv_generation?.label).toBe("Génération de CV")
    expect(chart.data[1]).toEqual({
      cv_generation: 0.5,
      cv_import: 0,
      date: "2026-09-25",
    })
  })

  it("merges the tail when there are more features than colours", () => {
    const chart = featureCostChart([
      {
        ats_impact: 0.01,
        company_context: 0.02,
        cv_generation: 0.6,
        cv_import: 0.5,
        date: "2026-09-25",
        letter_generation: 0.4,
        offer_structuring: 0.3,
      },
    ])

    expect(chart.keys).toHaveLength(MAX_CHARTED_FEATURES)
    expect(chart.keys.at(-1)).toBe(REST_KEY)
    expect(chart.config[REST_KEY]?.label).toBe("Autres usages")
    expect(chart.data[0]?.[REST_KEY]).toBe(0.03)
  })

  it("is empty without data", () => {
    expect(featureCostChart([])).toEqual({ config: {}, data: [], keys: [] })
  })
})
