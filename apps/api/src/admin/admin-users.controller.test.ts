import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import type { CreditsService } from "../credits/credits.service";
import type { PrivacyService } from "../privacy/privacy.service";
import { AdminUsersController } from "./admin-users.controller";

const accounts = [
  { consent: null, email: "admin@example.com", role: "admin" as const },
  { consent: null, email: "alice@example.com", role: "user" as const },
  { consent: null, email: "bob@example.com", role: "user" as const },
];

function createController(sessionRole: "admin" | "user" | null = "admin") {
  const authService = {
    listAccounts: vi.fn().mockReturnValue(accounts),
    readSessionFromCookieHeader: vi
      .fn()
      .mockReturnValue(
        sessionRole ? { email: "admin@example.com", role: sessionRole } : null,
      ),
    updateAccountRole: vi
      .fn()
      .mockImplementation((email: string, role: string) => ({ email, role })),
  } as unknown as AuthService;
  const creditsService = {
    getSummaryForUser: vi.fn().mockResolvedValue({ balance: 10, history: [] }),
  } as unknown as CreditsService;
  const privacyService = {
    purgeAccount: vi.fn().mockResolvedValue({ deletedApplications: 2 }),
  } as unknown as PrivacyService;

  return {
    authService,
    controller: new AdminUsersController(
      authService,
      creditsService,
      privacyService,
    ),
    privacyService,
  };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("AdminUsersController", () => {
  it("lists users with search, role filter and pagination", async () => {
    const { controller } = createController();

    const result = await controller.listUsers("1", "1", "o", "user", request);

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });
    expect(result.users[0]).toMatchObject({ balance: 10, role: "user" });
  });

  it("caps the page size at 100", async () => {
    const { controller } = createController();

    const result = await controller.listUsers(
      undefined,
      "500",
      undefined,
      undefined,
      request,
    );

    expect(result.pagination.pageSize).toBe(100);
  });

  it("updates the role of another user", async () => {
    const { authService, controller } = createController();

    await expect(
      controller.updateUser("alice%40example.com", { role: "admin" }, request),
    ).resolves.toEqual({ user: { email: "alice@example.com", role: "admin" } });
    expect(authService.updateAccountRole).toHaveBeenCalledWith(
      "alice@example.com",
      "admin",
    );
  });

  it("prevents an admin from demoting or deleting themselves", async () => {
    const { controller } = createController();

    await expect(
      controller.updateUser("admin@example.com", { role: "user" }, request),
    ).rejects.toThrow(BadRequestException);
    await expect(controller.deleteUser("admin@example.com", request)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("purges another user's data and rejects unknown users", async () => {
    const { controller, privacyService } = createController();

    await expect(controller.deleteUser("bob@example.com", request)).resolves.toEqual({
      deletion: { deletedApplications: 2 },
    });
    expect(privacyService.purgeAccount).toHaveBeenCalledWith("bob@example.com");
    await expect(controller.deleteUser("ghost@example.com", request)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("requires an admin session", async () => {
    await expect(
      createController("user").controller.listUsers(
        undefined,
        undefined,
        undefined,
        undefined,
        request,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      createController(null).controller.deleteUser("bob@example.com", request),
    ).rejects.toThrow(UnauthorizedException);
  });
});
