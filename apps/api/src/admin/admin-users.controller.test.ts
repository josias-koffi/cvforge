import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { createInMemoryAccountStore } from "../auth/testing/in-memory-account-store";
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
    // Mirrors the real service: demotion only, never a promotion (vision §3.2).
    demoteAccountToUser: vi
      .fn()
      .mockImplementation((email: string, role: string) => {
        if (role !== "user") {
          throw new BadRequestException(
            "Seule la retrogradation en utilisateur est possible.",
          );
        }

        return { email, role };
      }),
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

  it("demotes another user", async () => {
    const { authService, controller } = createController();

    await expect(
      controller.updateUser("alice%40example.com", { role: "user" }, request),
    ).resolves.toEqual({ user: { email: "alice@example.com", role: "user" } });
    expect(authService.demoteAccountToUser).toHaveBeenCalledWith(
      "alice@example.com",
      "user",
    );
  });

  // vision §3.2: no admin action may grant the admin role — only the
  // nominative invitation link does.
  it("never promotes a user to admin", async () => {
    const { authService, controller } = createController();

    await expect(
      controller.updateUser("alice%40example.com", { role: "admin" }, request),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.updateUser("alice%40example.com", {}, request),
    ).rejects.toThrow(BadRequestException);
    expect(authService).not.toHaveProperty("updateAccountRole");
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

  // The tests above stub AuthService. This one wires the real service to the
  // real store so nothing between the HTTP body and the database can grant
  // `admin` — the guarantee vision §3.2 asks for.
  it("refuses a promotion through the whole controller-to-store path", async () => {
    const store = createInMemoryAccountStore();
    const authService = new AuthService(
      {
        apiUrl: "http://localhost:3333",
        appUrl: "http://localhost:3000",
        cookieDomain: undefined,
        cookieName: "cvforge_session",
        magicLinkTtlMinutes: 15,
        secureCookies: false,
        sessionSecret: "test-secret",
        sessionTtlDays: 7,
      },
      store,
    );

    // First account in, so it lands as admin; the cookie comes from the real
    // magic-link flow rather than a hand-built session.
    const { magicLink } = await authService.requestMagicLink(
      "admin@example.com",
      true,
    );
    const consumed = await authService.consumeMagicLink(
      new URL(magicLink).searchParams.get("token") ?? "",
    );
    const adminRequest = {
      headers: { cookie: `${consumed.cookie.name}=${consumed.cookie.value}` },
    };

    await store.resolveRole("alice@example.com");
    const controller = new AdminUsersController(
      authService,
      { getSummaryForUser: vi.fn().mockResolvedValue({ balance: 0, history: [] }) } as unknown as CreditsService,
      { purgeAccount: vi.fn() } as unknown as PrivacyService,
    );

    await expect(
      controller.updateUser("alice@example.com", { role: "admin" }, adminRequest),
    ).rejects.toThrow(BadRequestException);
    expect(await store.readAccount("alice@example.com")).toMatchObject({ role: "user" });

    await expect(
      controller.updateUser("alice@example.com", { role: "user" }, adminRequest),
    ).resolves.toMatchObject({ user: { email: "alice@example.com", role: "user" } });
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
