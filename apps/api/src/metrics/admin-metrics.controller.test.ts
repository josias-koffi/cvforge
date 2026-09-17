import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import type { AuthService } from "../auth/auth.service";
import { AdminMetricsController } from "./admin-metrics.controller";

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

  return new AdminMetricsController(authService, balanceService);
}

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
});
