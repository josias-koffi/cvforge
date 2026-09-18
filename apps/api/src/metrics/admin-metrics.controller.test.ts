import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import type { AuthService } from "../auth/auth.service";
import { AdminMetricsController } from "./admin-metrics.controller";
import type { MetricsService } from "./metrics.service";
import type { AdminMetrics } from "./metrics.types";

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

  const metricsService = {
    readAdminMetrics: vi.fn().mockResolvedValue(METRICS),
  } as unknown as MetricsService;

  return new AdminMetricsController(authService, balanceService, metricsService);
}

const METRICS = {
  activeWindowDays: 30,
  apiCost: null,
  applications: { totalCount: 3 },
  credits: { consumed: 9, granted: 0, sold: 550 },
  documents: {
    cvImportCount: 0,
    generatedCvCount: 2,
    generatedLetterCount: 1,
    offerEnrichmentCount: 1,
  },
  generatedAt: "2026-09-17T12:00:00.000Z",
  interviews: { completedCount: 0, totalCount: 0 },
  margin: null,
  revenue: { currency: "eur", grossCents: 999, paidOrderCount: 1 },
  users: { activeCount: 1, adminCount: 1, totalCount: 2 },
} satisfies AdminMetrics;

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

  it("returns the dashboard metrics", async () => {
    await expect(createController().readMetrics(request)).resolves.toEqual(METRICS);
  });

  it("exports the metrics as a timestamped CSV attachment", async () => {
    const file = await createController().exportMetricsCsv(request);
    const { disposition, type } = file.getHeaders();

    expect(type).toBe("text/csv; charset=utf-8");
    expect(disposition).toBe(
      'attachment; filename="cvforge-metrics-2026-09-17T12-00-00.csv"',
    );
    expect(file.getStream().read().toString("utf8")).toContain("cv_generated,2,count");
  });

  it("requires an admin session on the metrics and the export too", async () => {
    await expect(
      createController({ sessionRole: "user" }).readMetrics(request),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      createController({ sessionRole: "user" }).exportMetricsCsv(request),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      createController({ sessionRole: null }).readMetrics(request),
    ).rejects.toThrow(UnauthorizedException);
  });
});
