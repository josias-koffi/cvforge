import { describe, expect, it, vi } from "vitest";
import { OnboardingService } from "./onboarding.service";
import type { OnboardingStore } from "./onboarding.types";

const NOW = new Date("2026-09-25T10:00:00.000Z");

function makeStore(): OnboardingStore {
  return {
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markGettingStartedDismissed: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue({
      completedAt: NOW,
      gettingStartedDismissedAt: null,
    }),
  };
}

describe("OnboardingService", () => {
  it("answers the dates as ISO strings", async () => {
    const service = new OnboardingService(makeStore());

    await expect(service.status("jane@example.com")).resolves.toEqual({
      completedAt: NOW.toISOString(),
      gettingStartedDismissedAt: null,
    });
  });

  it("completes the onboarding at the current instant", async () => {
    const store = makeStore();
    const service = new OnboardingService(store, () => NOW);

    await service.complete("jane@example.com");

    expect(store.markCompleted).toHaveBeenCalledWith("jane@example.com", NOW);
  });

  it("hides the checklist at the current instant", async () => {
    const store = makeStore();
    const service = new OnboardingService(store, () => NOW);

    await service.dismissGettingStarted("jane@example.com");

    expect(store.markGettingStartedDismissed).toHaveBeenCalledWith(
      "jane@example.com",
      NOW,
    );
  });
});
