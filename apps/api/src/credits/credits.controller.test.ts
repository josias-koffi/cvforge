import {
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { CreditsController } from "./credits.controller";
import { CreditsService } from "./credits.service";

function makeController(session: unknown) {
  const creditsService = {
    getSummaryForUser: vi.fn().mockReturnValue({
      balance: 47,
      history: [],
      isLowBalance: false,
      lowBalanceThreshold: 20,
      userEmail: "user@example.com",
    }),
    grantCredits: vi.fn().mockReturnValue({
      action: "admin_grant",
      amount: 50,
      balanceAfter: 50,
      createdAt: "2026-04-21T12:00:00.000Z",
      id: "entry-001",
      metadata: { adminEmail: "admin@example.com" },
      note: "Support credit",
      type: "admin_grant",
      userEmail: "user@example.com",
    }),
  } as unknown as CreditsService;
  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(session),
  } as unknown as AuthService;

  return new CreditsController(creditsService, authService);
}

describe("CreditsController", () => {
  it("returns the authenticated user's credit summary", () => {
    const controller = makeController({
      email: "user@example.com",
      role: "user",
    });

    expect(
      controller.getMyCredits({ headers: { cookie: "cvforge_session=abc" } }),
    ).toEqual({
      credits: {
        balance: 47,
        history: [],
        isLowBalance: false,
        lowBalanceThreshold: 20,
        userEmail: "user@example.com",
      },
    });
  });

  it("rejects unauthenticated access", () => {
    const controller = makeController(null);

    expect(() => controller.getMyCredits({ headers: {} })).toThrow(
      UnauthorizedException,
    );
  });

  it("requires admin role for grants", () => {
    const controller = makeController({
      email: "user@example.com",
      role: "user",
    });

    expect(() =>
      controller.grantCredits(
        {
          credits: 50,
          note: "Support credit",
          userEmail: "other@example.com",
        },
        { headers: { cookie: "cvforge_session=abc" } },
      ),
    ).toThrow(ForbiddenException);
  });
});
