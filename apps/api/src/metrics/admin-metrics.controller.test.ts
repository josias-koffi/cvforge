import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import type { AuthService } from "../auth/auth.service";
import { AdminMetricsController } from "./admin-metrics.controller";
import type { CockpitService } from "./cockpit.service";
import type { CockpitSnapshot } from "./metrics-csv";

const BALANCE = {
  fetchedAt: "2026-09-17T10:00:00.000Z",
  remaining: 74.75,
  stale: false,
  totalCredits: 100.5,
  totalUsage: 25.75,
};

function createController({
  alertThreshold = 5,
  balance = BALANCE as typeof BALANCE | null,
  isEnabled = true,
  sessionRole = "admin" as "admin" | "user" | null,
} = {}) {
  const authService = {
    readSessionFromCookieHeader: vi
      .fn()
      .mockReturnValue(
        sessionRole ? { email: "admin@example.com", role: sessionRole } : null,
      ),
  } as unknown as AuthService;
  const balanceService = {
    alertThreshold,
    getBalance: vi.fn().mockResolvedValue(balance),
    isEnabled,
  } as unknown as OpenRouterBalanceService;

  const tab = () => ({ read: vi.fn().mockResolvedValue({ tab: true }) });
  const cockpit = {
    acquisition: tab(),
    aiCosts: tab(),
    market: tab(),
    overview: tab(),
    revenue: tab(),
    snapshot: vi.fn().mockResolvedValue(SNAPSHOT),
    usage: tab(),
  };
  const controller = new AdminMetricsController(
    authService,
    balanceService,
    cockpit as unknown as CockpitService,
  );

  return Object.assign(controller, { tabs: cockpit });
}

const EMPTY_KPI = { previous: null, value: 0 };
const WINDOW = {
  bucket: "day" as const,
  generatedAt: "2026-09-25T12:00:00.000Z",
  period: "7" as const,
  previousSince: null,
  since: null,
};
const SNAPSHOT = {
  acquisition: { funnels: [], publicAts: { scans: 0, unlockRate: null, unlocked: 0 }, series: [], window: WINDOW },
  aiCosts: {
    balance: { enabled: false, remainingUsd: null, runwayDays: null, stale: false },
    creditValueEurCents: null,
    features: [],
    kpis: { averageCallCostUsd: EMPTY_KPI, calls: EMPTY_KPI, costUsd: EMPTY_KPI, errorRate: EMPTY_KPI },
    models: [],
    series: [],
    trackingSince: null,
    units: [],
    usdToEurRate: 0.92,
    window: WINDOW,
  },
  market: {
    dailyOffers: { applied: 0, dismissed: 0, proposed: 0, saved: 0, seen: 0 },
    topAppliedCompanies: [],
    topCheckedCompanies: [],
    topCompanies: [{ count: 2, label: "ACME" }],
    topJobTitles: [],
    topSearchedJobs: [],
    topTargetRoles: [],
    window: WINDOW,
  },
  overview: {
    insights: [],
    kpis: {
      activeUsers: EMPTY_KPI,
      aiCostEurCents: EMPTY_KPI,
      grossMarginCents: EMPTY_KPI,
      newBuyers: EMPTY_KPI,
      revenueCents: { previous: null, value: 999 },
      signups: EMPTY_KPI,
    },
    revenueVsCost: [],
    signupsVsActive: [],
    window: WINDOW,
  },
  revenue: {
    abandonedCheckoutRate: null,
    credits: { consumed: 0, granted: 0, sold: 0, welcome: 0 },
    funnel: { firstGeneration: 0, firstPurchase: 0, onboarded: 0, repeatPurchase: 0, signups: 0 },
    kpis: {
      averageBasketCents: EMPTY_KPI,
      buyers: EMPTY_KPI,
      paidOrders: EMPTY_KPI,
      revenueCents: EMPTY_KPI,
      revenuePerActiveCents: EMPTY_KPI,
    },
    medianDaysToFirstPurchase: null,
    offers: [],
    repeatBuyerRate: null,
    series: [],
    window: WINDOW,
  },
  usage: {
    atsScoresByEngine: [],
    cvTemplates: [],
    interviews: { abandoned: 0, averageMinutes: null, completed: 0 },
    kpis: {
      applications: EMPTY_KPI,
      atsScans: EMPTY_KPI,
      cvGenerated: EMPTY_KPI,
      cvImported: EMPTY_KPI,
      interviews: EMPTY_KPI,
      lettersGenerated: EMPTY_KPI,
    },
    letterTemplates: [],
    onboardingRate: null,
    retention: [],
    series: [],
    window: WINDOW,
  },
} satisfies CockpitSnapshot;

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("AdminMetricsController", () => {
  it("returns the balance with the alert threshold", async () => {
    await expect(
      createController().readOpenRouterBalance(request),
    ).resolves.toEqual({
      alertThreshold: 5,
      balance: BALANCE,
      isLowBalance: false,
      supervisionEnabled: true,
    });
  });

  it("flags a balance under the threshold", async () => {
    await expect(
      createController({
        balance: { ...BALANCE, remaining: 4.99 },
      }).readOpenRouterBalance(request),
    ).resolves.toMatchObject({ isLowBalance: true });
  });

  it("reports supervision as off rather than failing when no key is set", async () => {
    await expect(
      createController({ balance: null, isEnabled: false }).readOpenRouterBalance(
        request,
      ),
    ).resolves.toEqual({
      alertThreshold: 5,
      balance: null,
      isLowBalance: false,
      supervisionEnabled: false,
    });
  });

  it("requires an admin session", async () => {
    await expect(
      createController({ sessionRole: "user" }).readOpenRouterBalance(request),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      createController({ sessionRole: null }).readOpenRouterBalance(request),
    ).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    ["readOverview", "overview"],
    ["readRevenue", "revenue"],
    ["readAiCosts", "aiCosts"],
    ["readUsage", "usage"],
    ["readMarket", "market"],
    ["readAcquisition", "acquisition"],
  ] as const)("%s reads its tab over the requested period", async (route, tab) => {
    const controller = createController();

    await expect(controller[route](request, "90")).resolves.toEqual({ tab: true });
    expect(controller.tabs[tab].read).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "day", days: 90, period: "90" }),
    );
  });

  it("falls back to 30 days on an unknown period rather than failing", async () => {
    const controller = createController();

    await controller.readOverview(request, "forever");

    expect(controller.tabs.overview.read).toHaveBeenCalledWith(
      expect.objectContaining({ period: "30" }),
    );
  });

  it("exports the cockpit as a CSV named after the period", async () => {
    const file = await createController().exportMetricsCsv(request, "7");
    const { disposition, type } = file.getHeaders();

    expect(type).toBe("text/csv; charset=utf-8");
    expect(disposition).toBe(
      'attachment; filename="cvforge-pilotage-7j-2026-09-25T12-00-00.csv"',
    );
    const csv = file.getStream().read().toString("utf8");
    expect(csv).toContain("overview_revenueCents,9.99,eur");
    expect(csv).toContain("market_company:ACME,2,count");
  });

  it.each([
    "readOverview",
    "readRevenue",
    "readAiCosts",
    "readUsage",
    "readMarket",
    "readAcquisition",
    "exportMetricsCsv",
  ] as const)("%s requires an admin session", async (route) => {
    await expect(
      createController({ sessionRole: "user" })[route](request),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      createController({ sessionRole: null })[route](request),
    ).rejects.toThrow(UnauthorizedException);
  });
});
