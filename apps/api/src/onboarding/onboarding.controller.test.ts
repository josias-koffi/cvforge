import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import { OnboardingController } from "./onboarding.controller";
import type { OnboardingService } from "./onboarding.service";

const STATUS = { completedAt: null, gettingStartedDismissedAt: null };
const REQUEST = { headers: { cookie: "cvforge_session=abc" } };

function makeController(session: { email: string } | null) {
  const service = {
    complete: vi.fn().mockResolvedValue(STATUS),
    dismissGettingStarted: vi.fn().mockResolvedValue(STATUS),
    status: vi.fn().mockResolvedValue(STATUS),
  };
  const auth = { readSessionFromCookieHeader: vi.fn().mockReturnValue(session) };

  return {
    controller: new OnboardingController(
      service as unknown as OnboardingService,
      auth as unknown as AuthService,
    ),
    service,
  };
}

describe("OnboardingController", () => {
  it("refuses a request without a session", async () => {
    const { controller } = makeController(null);

    await expect(controller.getStatus(REQUEST)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("reads, completes and dismisses for the session's account", async () => {
    const { controller, service } = makeController({ email: "jane@example.com" });

    await expect(controller.getStatus(REQUEST)).resolves.toEqual({
      onboarding: STATUS,
    });
    await controller.complete(REQUEST);
    await controller.dismissGettingStarted(REQUEST);

    expect(service.complete).toHaveBeenCalledWith("jane@example.com");
    expect(service.dismissGettingStarted).toHaveBeenCalledWith(
      "jane@example.com",
    );
  });
});
