import type { AcquisitionFunnel, UnitEconomics } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { buildInsights, change, MAX_INSIGHTS, type InsightInput } from "./insights";

const kpi = (value: number, previous: number | null = value) => ({ previous, value });

function input(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    acquisition: [],
    aiCosts: {
      balance: { enabled: true, remainingUsd: 100, runwayDays: 60, stale: false },
      models: [],
      trackingSince: "2026-09-01T00:00:00.000Z",
      units: [],
    },
    funnel: { firstGeneration: 0, firstPurchase: 0, onboarded: 0, repeatPurchase: 0, signups: 0 },
    kpis: {
      activeUsers: kpi(10),
      aiCostEurCents: kpi(100),
      grossMarginCents: kpi(900),
      newBuyers: kpi(1),
      revenueCents: kpi(1000),
      signups: kpi(10),
    },
    ...overrides,
  };
}

const unit = (marginRate: number): UnitEconomics => ({
  action: "cv_generation",
  costPerUnitEurCents: 70,
  creditsPerUnit: 3,
  marginRate,
  revenuePerUnitEurCents: 60,
  units: 4,
});

describe("buildInsights", () => {
  it("stays quiet when nothing moved", () => {
    expect(buildInsights(input())).toEqual([]);
  });

  it("reports a large move in revenue or signups, not a small one", () => {
    const insights = buildInsights(
      input({ kpis: { ...input().kpis, revenueCents: kpi(1500, 1000), signups: kpi(11, 10) } }),
    );

    expect(insights.map((i) => i.id)).toEqual(["revenue-trend"]);
    expect(insights[0]).toMatchObject({ title: "Chiffre d'affaires en hausse de 50 %", tone: "good" });
  });

  it("flags a unit sold at a loss before anything else", () => {
    const insights = buildInsights(
      input({
        aiCosts: { ...input().aiCosts, units: [unit(-16.7)] },
        kpis: { ...input().kpis, signups: kpi(20, 10) },
      }),
    );

    expect(insights[0]).toMatchObject({ id: "margin-cv_generation", tone: "bad" });
    expect(insights[0].title).toBe("Un CV généré coûte plus qu'il ne rapporte");
  });

  it("warns on a short OpenRouter runway and on a failing model", () => {
    const insights = buildInsights(
      input({
        aiCosts: {
          ...input().aiCosts,
          balance: { enabled: true, remainingUsd: 3, runwayDays: 4, stale: false },
          models: [{ averageDurationMs: 0, calls: 40, completionTokens: 0, costUsd: 1, errorRate: 12.5, fallbackRate: 0, model: "mistral", promptTokens: 0 }],
        },
      }),
    );

    expect(insights.map((i) => [i.id, i.tone])).toEqual([
      ["runway", "bad"],
      ["model-errors-mistral", "warn"],
    ]);
  });

  it("names the weakest step of the funnel and the best-converting tool", () => {
    const funnel: AcquisitionFunnel = {
      accountsActivated: 5,
      ctaClicks: 20,
      emailsSubmitted: 8,
      results: 60,
      tool: "ats",
      visitors: 100,
    };
    const insights = buildInsights(
      input({
        acquisition: [funnel],
        funnel: { firstGeneration: 30, firstPurchase: 3, onboarded: 40, repeatPurchase: 1, signups: 50 },
      }),
    );

    expect(insights.find((i) => i.id === "funnel-weakest")?.title).toBe(
      "Le parcours perd le plus à le premier achat",
    );
    expect(insights.find((i) => i.id === "best-tool")?.detail).toContain("5 %");
  });

  it("keeps at most the six most urgent", () => {
    const units = ["a", "b", "c", "d", "e", "f", "g"].map((action) => ({ ...unit(-1), action }));

    expect(buildInsights(input({ aiCosts: { ...input().aiCosts, units } }))).toHaveLength(MAX_INSIGHTS);
  });
});

describe("change", () => {
  it("is null without a previous figure to compare with", () => {
    expect(change(kpi(10, null))).toBeNull();
    expect(change(kpi(10, 0))).toBeNull();
    expect(change(kpi(15, 10))).toBe(50);
  });
});
