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
import type { AdminAuditService } from "./admin-audit.service";
import { AdminUsersController } from "./admin-users.controller";
import type { AdminUsersService } from "./admin-users.service";

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
    reactivateAccount: vi
      .fn()
      .mockImplementation((email: string) => ({ email, status: "active" })),
    revokeSessions: vi.fn().mockImplementation((email: string) => ({
      email,
      sessionsValidFrom: "2026-09-17T12:00:00.000Z",
    })),
    suspendAccount: vi
      .fn()
      .mockImplementation((email: string) => ({ email, status: "suspended" })),
  } as unknown as AuthService;
  const creditsService = {
    getSummaryForUser: vi.fn().mockResolvedValue({ balance: 10, history: [] }),
  } as unknown as CreditsService;
  const privacyService = {
    purgeAccount: vi.fn().mockResolvedValue({ deletedApplications: 2 }),
  } as unknown as PrivacyService;

  const audit = {
    recordDeletion: vi.fn(),
    recordDemotion: vi.fn(),
    recordReactivation: vi.fn(),
    recordSessionRevocation: vi.fn(),
    recordSuspension: vi.fn(),
  } as unknown as AdminAuditService;
  const directory = {
    listDirectory: vi.fn().mockResolvedValue({
      filters: { balance: "all", query: "", role: "all", status: "all" },
      pagination: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
      users: [],
    }),
  } as unknown as AdminUsersService;

  return {
    audit,
    authService,
    controller: new AdminUsersController(
      authService,
      creditsService,
      privacyService,
      audit,
      directory,
    ),
    directory,
    privacyService,
  };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("AdminUsersController", () => {
  it("passes search, filters and pagination to the directory, capped", async () => {
    const { controller, directory } = createController();

    await controller.listUsers("2", "500", "Alice", "user", "active", "low", request);

    expect(directory.listDirectory).toHaveBeenCalledWith({
      balance: "low",
      maxPageSize: 100,
      page: "2",
      pageSize: "500",
      query: "Alice",
      role: "user",
      status: "active",
    });
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
    await expect(
      controller.deleteUser(
        "admin@example.com",
        { confirmationEmail: "admin@example.com" },
        request,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("purges another user's data, logs it, and rejects unknown users", async () => {
    const { audit, controller, privacyService } = createController();

    await expect(
      controller.deleteUser(
        "bob@example.com",
        { confirmationEmail: "BOB@example.com", note: "Demande RGPD" },
        request,
      ),
    ).resolves.toEqual({ deletion: { deletedApplications: 2 } });
    expect(privacyService.purgeAccount).toHaveBeenCalledWith("bob@example.com");
    expect(audit.recordDeletion).toHaveBeenCalledWith({
      actorEmail: "admin@example.com",
      note: "Demande RGPD",
      targetEmail: "bob@example.com",
    });
    await expect(
      controller.deleteUser(
        "ghost@example.com",
        { confirmationEmail: "ghost@example.com" },
        request,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("refuses a deletion whose confirmation email does not match", async () => {
    const { controller, privacyService } = createController();

    await expect(
      controller.deleteUser(
        "bob@example.com",
        { confirmationEmail: "alice@example.com" },
        request,
      ),
    ).rejects.toThrow(/adresse email du compte/);
    await expect(
      controller.deleteUser("bob@example.com", {}, request),
    ).rejects.toThrow(BadRequestException);
    expect(privacyService.purgeAccount).not.toHaveBeenCalled();
  });

  it("suspends and reactivates an account, logging each", async () => {
    const { audit, authService, controller } = createController();

    await expect(
      controller.updateUserStatus(
        "bob%40example.com",
        { note: "Abus signale", status: "suspended" },
        request,
      ),
    ).resolves.toEqual({
      user: { email: "bob@example.com", status: "suspended" },
    });
    expect(authService.suspendAccount).toHaveBeenCalledWith("bob@example.com");
    expect(audit.recordSuspension).toHaveBeenCalledWith({
      actorEmail: "admin@example.com",
      note: "Abus signale",
      targetEmail: "bob@example.com",
    });

    await controller.updateUserStatus(
      "bob@example.com",
      { status: "active" },
      request,
    );
    expect(authService.reactivateAccount).toHaveBeenCalledWith("bob@example.com");
    expect(audit.recordReactivation).toHaveBeenCalled();
  });

  it("rejects an unknown status and self-suspension", async () => {
    const { controller } = createController();

    await expect(
      controller.updateUserStatus("bob@example.com", { status: "banned" }, request),
    ).rejects.toThrow(/active ou suspended/);
    await expect(
      controller.updateUserStatus(
        "admin@example.com",
        { status: "suspended" },
        request,
      ),
    ).rejects.toThrow(/votre propre compte/);
  });

  it("revokes sessions and logs it", async () => {
    const { audit, authService, controller } = createController();

    await expect(
      controller.revokeUserSessions("bob@example.com", {}, request),
    ).resolves.toMatchObject({ user: { email: "bob@example.com" } });
    expect(authService.revokeSessions).toHaveBeenCalledWith("bob@example.com");
    expect(audit.recordSessionRevocation).toHaveBeenCalled();
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
      { recordDemotion: vi.fn() } as unknown as AdminAuditService,
      { listDirectory: vi.fn() } as unknown as AdminUsersService,
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
        undefined,
        undefined,
        request,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      createController(null).controller.deleteUser(
        "bob@example.com",
        { confirmationEmail: "bob@example.com" },
        request,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
