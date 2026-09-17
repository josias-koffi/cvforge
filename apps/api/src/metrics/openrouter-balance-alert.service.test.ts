import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE } from "@cvforge/types";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { OpenRouterBalanceAlertService } from "./openrouter-balance-alert.service";

const ACCOUNTS = [
  { consent: null, email: "admin@example.com", role: "admin" as const },
  { consent: null, email: "second@example.com", role: "admin" as const },
  { consent: null, email: "user@example.com", role: "user" as const },
];

function createBalanceService(
  overrides: Partial<{
    alertThreshold: number;
    isEnabled: boolean;
    remaining: number | null;
    stale: boolean;
  }> = {},
) {
  const {
    alertThreshold = 5,
    isEnabled = true,
    remaining = 1.25,
    stale = false,
  } = overrides;

  return {
    alertThreshold,
    getBalance: vi.fn().mockResolvedValue(
      remaining === null
        ? null
        : {
            fetchedAt: "2026-09-17T10:00:00.000Z",
            remaining,
            stale,
            totalCredits: 100,
            totalUsage: 100 - remaining,
          },
    ),
    isEnabled,
  } as unknown as OpenRouterBalanceService;
}

function createService(
  balanceService: OpenRouterBalanceService,
  createOncePerDay = vi.fn().mockResolvedValue({ id: "notification-id" }),
) {
  const notifications = { createOncePerDay };
  const authService = { listAccounts: vi.fn().mockResolvedValue(ACCOUNTS) };

  return {
    authService,
    notifications,
    service: new OpenRouterBalanceAlertService(
      balanceService,
      authService,
      notifications,
    ),
  };
}

describe("OpenRouterBalanceAlertService", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("alerts every admin and no plain user when the balance is low", async () => {
    const { notifications, service } = createService(createBalanceService());

    await expect(service.checkBalance()).resolves.toBe(2);
    expect(notifications.createOncePerDay).toHaveBeenCalledTimes(2);

    const recipients = notifications.createOncePerDay.mock.calls.map(
      (call) => (call[0] as { userEmail: string }).userEmail,
    );
    expect(recipients).toEqual(["admin@example.com", "second@example.com"]);

    const [draft] = notifications.createOncePerDay.mock.calls[0] as [
      { linkHref: string; message: string; type: string },
    ];
    expect(draft.type).toBe(NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE);
    expect(draft.linkHref).toBe("/admin/metrics");
    expect(draft.message).toContain("1.25");
    expect(draft.message).toContain("5.00");
  });

  it("stays silent when the balance is at or above the threshold", async () => {
    const { notifications, service } = createService(
      createBalanceService({ remaining: 5 }),
    );

    await expect(service.checkBalance()).resolves.toBe(0);
    expect(notifications.createOncePerDay).not.toHaveBeenCalled();
  });

  it("stays silent when supervision is disabled or the balance is unknown", async () => {
    const disabled = createService(
      createBalanceService({ isEnabled: false, remaining: 0 }),
    );
    await expect(disabled.service.checkBalance()).resolves.toBe(0);
    expect(disabled.notifications.createOncePerDay).not.toHaveBeenCalled();
    expect(disabled.authService.listAccounts).not.toHaveBeenCalled();

    const unknown = createService(createBalanceService({ remaining: null }));
    await expect(unknown.service.checkBalance()).resolves.toBe(0);
    expect(unknown.notifications.createOncePerDay).not.toHaveBeenCalled();
  });

  it("reports how many admins were actually alerted when a daily alert was already sent", async () => {
    const { service } = createService(
      createBalanceService(),
      vi
        .fn()
        .mockResolvedValueOnce({ id: "notification-id" })
        .mockResolvedValueOnce(null),
    );

    await expect(service.checkBalance()).resolves.toBe(1);
  });

  it("says so when the balance it alerts on is stale", async () => {
    const { notifications, service } = createService(
      createBalanceService({ stale: true }),
    );

    await service.checkBalance();

    const [draft] = notifications.createOncePerDay.mock.calls[0] as [
      { message: string },
    ];
    expect(draft.message).toContain("perimee");
  });

  it("checks on boot, then daily, and stops on shutdown", async () => {
    vi.useFakeTimers();
    const balanceService = createBalanceService();
    const { service } = createService(balanceService);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(balanceService.getBalance).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(86_400_000);
    expect(balanceService.getBalance).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(86_400_000 * 3);
    expect(balanceService.getBalance).toHaveBeenCalledTimes(2);
  });

  it("logs and survives a failing check instead of crashing the process", async () => {
    vi.useFakeTimers();
    const balanceService = createBalanceService();
    vi.mocked(balanceService.getBalance).mockRejectedValue(new Error("boom"));
    const { service } = createService(balanceService);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    expect(console.error).toHaveBeenCalledWith(
      "[openrouter] balance alert failed",
      expect.objectContaining({ message: "boom" }),
    );

    service.onModuleDestroy();
  });
});
