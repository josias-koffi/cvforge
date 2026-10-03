import { describe, expect, it } from "vitest";
import { summarizeBalance } from "./ai-costs.service";
import { buildUnitEconomics } from "./unit-economics";

describe("summarizeBalance", () => {
  it("extrapolates the days left from the period's daily spend", () => {
    expect(summarizeBalance({ remaining: 30, stale: false }, 14, 7)).toEqual({
      enabled: true,
      remainingUsd: 30,
      runwayDays: 15,
      stale: false,
    });
  });

  it("says nothing about a runway without a balance or without spend", () => {
    expect(summarizeBalance(null, 14, 7).runwayDays).toBeNull();
    expect(
      summarizeBalance({ remaining: 30, stale: true }, 0, 7),
    ).toMatchObject({
      runwayDays: null,
      stale: true,
    });
  });
});

describe("buildUnitEconomics", () => {
  const features = [
    {
      calls: 2,
      completionTokens: 0,
      costUsd: 1,
      errors: 0,
      feature: "cv_generation" as const,
      promptTokens: 0,
    },
    {
      calls: 1,
      completionTokens: 0,
      costUsd: 5,
      errors: 0,
      feature: "ats_impact" as const,
      promptTokens: 0,
    },
  ];

  it("sets a unit's cost against the credits it was charged", () => {
    const cv = buildUnitEconomics({
      creditValueEurCents: 20,
      creditsCharged: { cv_generation: 6 },
      features,
      usdToEurRate: 1,
    }).find((unit) => unit.action === "cv_generation");

    // Two CVs, 1 USD between them, 3 credits at 20 cents each.
    expect(cv).toEqual({
      action: "cv_generation",
      costPerUnitEurCents: 50,
      creditsPerUnit: 3,
      marginRate: 16.7,
      revenuePerUnitEurCents: 60,
      units: 2,
    });
  });

  it("prices the alerts' analysis per day billed, the free analyses of that day included (US-168)", () => {
    const enrich = buildUnitEconomics({
      creditValueEurCents: 20,
      // Three days billed; 30 analyses between them, 0.3 USD in all.
      creditsCharged: { job_alert_enrich: 3 },
      features: [
        {
          calls: 30,
          completionTokens: 0,
          costUsd: 0.3,
          errors: 0,
          feature: "job_alert_enrich",
          promptTokens: 0,
        },
      ],
      usdToEurRate: 1,
    }).find((unit) => unit.action === "job_alert_enrich");

    expect(enrich).toMatchObject({
      costPerUnitEurCents: 10,
      marginRate: 50,
      units: 3,
    });
  });

  it("leaves unbilled calls out, and prices nothing before any sale", () => {
    const units = buildUnitEconomics({
      creditValueEurCents: null,
      creditsCharged: {},
      features,
      usdToEurRate: 1,
    });

    expect(units.map((unit) => unit.action)).not.toContain("ats_impact");
    expect(
      units.every((unit) => unit.marginRate === null && unit.units === 0),
    ).toBe(true);
  });
});
