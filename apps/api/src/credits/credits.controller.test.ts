import {
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import type { AdminAuditService } from "../admin/admin-audit.service";
import { CreditsController } from "./credits.controller";
import { CreditsService } from "./credits.service";

function makeController(session: unknown) {
  const creditsService = {
    getSummaryForUser: vi.fn().mockResolvedValue({
      balance: 47,
      history: [],
      isLowBalance: false,
      lowBalanceThreshold: 20,
      userEmail: "user@example.com",
    }),
    grantCredits: vi.fn().mockResolvedValue({
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
    listAccounts: vi.fn().mockReturnValue([
      {
        consent: {
          acceptedAt: "2026-04-20T08:00:00.000Z",
          source: "passwordless",
          version: "2026-04-mvp",
        },
        email: "admin@example.com",
        role: "admin",
      },
      {
        consent: {
          acceptedAt: "2026-04-21T08:00:00.000Z",
          source: "passwordless",
          version: "2026-04-mvp",
        },
        email: "user@example.com",
        role: "user",
      },
      {
        consent: null,
        email: "zoe@example.com",
        role: "user",
      },
    ]),
    readSessionFromCookieHeader: vi.fn().mockReturnValue(session),
  } as unknown as AuthService;

  return new CreditsController(creditsService, authService, { recordCreditGrant: vi.fn() } as unknown as AdminAuditService);
}

describe("CreditsController", () => {
  it("returns the authenticated user's credit summary", async () => {
    const controller = makeController({
      email: "user@example.com",
      role: "user",
    });

    await expect(
      controller.getMyCredits({ headers: { cookie: "cvforge_session=abc" } }),
    ).resolves.toEqual({
      credits: {
        balance: 47,
        history: [],
        isLowBalance: false,
        lowBalanceThreshold: 20,
        userEmail: "user@example.com",
      },
    });
  });

  it("rejects unauthenticated access", async () => {
    const controller = makeController(null);

    await expect(controller.getMyCredits({ headers: {} })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("requires admin role for grants", async () => {
    const controller = makeController({
      email: "user@example.com",
      role: "user",
    });

    await expect(
      controller.grantCredits(
        {
          credits: 50,
          note: "Support credit",
          userEmail: "other@example.com",
        },
        { headers: { cookie: "cvforge_session=abc" } },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lists paginated admin users with filters and latest manual grant metadata", async () => {
    const controller = makeController({
      email: "admin@example.com",
      role: "admin",
    });
    const creditsService = controller["creditsService"] as unknown as {
      getSummaryForUser: ReturnType<typeof vi.fn>;
    };

    creditsService.getSummaryForUser.mockImplementation(async (email: string) => {
      if (email === "user@example.com") {
        return {
          balance: 47,
          history: [
            {
              action: "admin_grant",
              amount: 25,
              balanceAfter: 47,
              createdAt: "2026-04-22T09:00:00.000Z",
              id: "entry-002",
              metadata: { adminEmail: "admin@example.com" },
              note: "Support commercial",
              type: "admin_grant",
              userEmail: email,
            },
          ],
          isLowBalance: false,
          lowBalanceThreshold: 20,
          userEmail: email,
        };
      }

      return {
        balance: 0,
        history: [],
        isLowBalance: true,
        lowBalanceThreshold: 20,
        userEmail: email,
      };
    });

    await expect(
      controller.listAdminUsers(
        "1",
        "1",
        "user",
        "user",
        { headers: { cookie: "cvforge_session=abc" } },
      ),
    ).resolves.toEqual({
      filters: {
        query: "user",
        role: "user",
      },
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 1,
        totalPages: 1,
      },
      requestedBy: "admin@example.com",
      users: [
        {
          balance: 47,
          consent: {
            acceptedAt: "2026-04-21T08:00:00.000Z",
            source: "passwordless",
            version: "2026-04-mvp",
          },
          email: "user@example.com",
          lastActivityAt: "2026-04-22T09:00:00.000Z",
          lastManualGrant: {
            adminEmail: "admin@example.com",
            amount: 25,
            createdAt: "2026-04-22T09:00:00.000Z",
            note: "Support commercial",
          },
          ledgerEntryCount: 1,
          role: "user",
        },
      ],
    });
  });
});
