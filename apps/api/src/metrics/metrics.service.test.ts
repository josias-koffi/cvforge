import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { buildMetricsCsv, buildMetricsCsvFilename } from "./metrics-csv";
import type { MetricsConfig } from "./metrics.config";
import { MetricsService } from "./metrics.service";
import type { MetricsStore, ProductCounters } from "./metrics.types";

const CONFIG: MetricsConfig = { activeWindowDays: 30, usdToEurRate: 0.92 };

const COUNTERS: ProductCounters = {
  activeUserCount: 4,
  applicationCount: 12,
  creditsConsumed: 90,
  creditsGranted: 50,
  creditsSold: 1100,
  cvImportCount: 2,
  generatedCvCount: 8,
  generatedLetterCount: 5,
  grossRevenueCents: 3998,
  interviewCompletedCount: 1,
  interviewCount: 3,
  offerEnrichmentCount: 6,
  paidOrderCount: 2,
  totalAdminCount: 1,
  totalUserCount: 9,
};

function createService({
  counters = COUNTERS,
  isEnabled = true,
  totalUsage = 10 as number | null,
} = {}) {
  const store: MetricsStore = {
    readProductCounters: vi.fn().mockResolvedValue(counters),
  };
  const balanceService = {
    getBalance: vi.fn().mockResolvedValue(
      totalUsage === null
        ? null
        : {
            fetchedAt: "2026-09-17T10:00:00.000Z",
            remaining: 90,
            stale: false,
            totalCredits: 100,
            totalUsage,
          },
    ),
    isEnabled,
  } as unknown as OpenRouterBalanceService;

  return { balanceService, service: new MetricsService(store, balanceService, CONFIG), store };
}

describe("MetricsService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shapes the counters and passes the configured active window to the store", async () => {
    const { service, store } = createService();

    const metrics = await service.readAdminMetrics();

    expect(store.readProductCounters).toHaveBeenCalledWith(30);
    expect(metrics).toMatchObject({
      activeWindowDays: 30,
      applications: { totalCount: 12 },
      credits: { consumed: 90, granted: 50, sold: 1100 },
      documents: { generatedCvCount: 8, generatedLetterCount: 5 },
      generatedAt: "2026-09-17T12:00:00.000Z",
      interviews: { completedCount: 1, totalCount: 3 },
      revenue: { currency: "eur", grossCents: 3998, paidOrderCount: 2 },
      users: { activeCount: 4, adminCount: 1, totalCount: 9 },
    });
  });

  it("converts the API cost at the configured rate and derives the margin", async () => {
    const { service } = createService({ totalUsage: 10 });

    const metrics = await service.readAdminMetrics();

    // 10 USD * 0.92 = 9.20 EUR = 920 cents; 3998 - 920 = 3078.
    expect(metrics.apiCost).toEqual({
      estimatedEurCents: 920,
      stale: false,
      usdToEurRate: 0.92,
      usedUsd: 10,
    });
    expect(metrics.margin).toEqual({
      netEurCents: 3078,
      ratio: 3078 / 3998,
    });
  });

  it("reports a negative margin rather than clamping it", async () => {
    const { service } = createService({
      counters: { ...COUNTERS, grossRevenueCents: 100 },
      totalUsage: 10,
    });

    await expect(service.readAdminMetrics()).resolves.toMatchObject({
      margin: { netEurCents: -820 },
    });
  });

  it("leaves the margin ratio null without revenue", async () => {
    const { service } = createService({
      counters: { ...COUNTERS, grossRevenueCents: 0 },
    });

    await expect(service.readAdminMetrics()).resolves.toMatchObject({
      margin: { ratio: null },
    });
  });

  it("omits cost and margin when supervision is off", async () => {
    const { balanceService, service } = createService({ isEnabled: false });

    const metrics = await service.readAdminMetrics();

    expect(balanceService.getBalance).not.toHaveBeenCalled();
    expect(metrics.apiCost).toBeNull();
    expect(metrics.margin).toBeNull();
  });

  it("omits cost and margin when the balance cannot be read", async () => {
    const { service } = createService({ totalUsage: null });

    await expect(service.readAdminMetrics()).resolves.toMatchObject({
      apiCost: null,
      margin: null,
    });
  });
});

describe("buildMetricsCsv", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports every dashboard metric, one per row, with its unit", async () => {
    const { service } = createService();
    const csv = buildMetricsCsv(await service.readAdminMetrics());
    const lines = csv.trimEnd().split("\n");

    expect(lines[0]).toBe("metric,value,unit");
    expect(lines).toContain("cv_generated,8,count");
    expect(lines).toContain("letters_generated,5,count");
    expect(lines).toContain("users_active,4,count");
    expect(lines).toContain("credits_sold,1100,credits");
    expect(lines).toContain("credits_consumed,90,credits");
    expect(lines).toContain("revenue_gross,39.98,eur");
    expect(lines).toContain("api_cost_estimated,9.20,eur");
    expect(lines).toContain("margin_net,30.78,eur");
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("leaves cost and margin cells empty when supervision is off", async () => {
    const { service } = createService({ isEnabled: false });
    const lines = buildMetricsCsv(await service.readAdminMetrics()).split("\n");

    expect(lines).toContain("api_cost_estimated,,eur");
    expect(lines).toContain("margin_net,,eur");
    expect(lines).toContain("margin_ratio,,ratio");
  });

  it("timestamps the filename so exports never overwrite each other", () => {
    expect(buildMetricsCsvFilename("2026-09-17T12:00:00.000Z")).toBe(
      "cvforge-metrics-2026-09-17T12-00-00.csv",
    );
  });
});
