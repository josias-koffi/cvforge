import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import type {
  AuthAccountStore,
  AuthConfig,
  AuthInvitation,
  AuthRole,
} from "./auth.types";

const config: AuthConfig = {
  apiUrl: "http://localhost:3333",
  appUrl: "http://localhost:3000",
  magicLinkTtlMinutes: 15,
  sessionTtlDays: 7,
  cookieName: "cvforge_session",
  sessionSecret: "test-secret",
  secureCookies: false,
  stateFilePath: "/tmp/cvforge-auth-state-test.json",
};

function createInMemoryAccountStore(): AuthAccountStore {
  const accounts = new Map<string, AuthRole>();
  const invitations = new Map<string, AuthInvitation>();
  let bootstrapConsumed = false;

  return {
    resolveRole(email) {
      const existingRole = accounts.get(email);

      if (existingRole) {
        return existingRole;
      }

      const role: AuthRole = bootstrapConsumed ? "user" : "admin";

      accounts.set(email, role);

      if (role === "admin") {
        bootstrapConsumed = true;
      }

      return role;
    },
    assignInvitedRole(email, role) {
      const existingRole = accounts.get(email);
      const resolvedRole =
        existingRole === "admin" || role === "admin" ? "admin" : "user";

      accounts.set(email, resolvedRole);

      if (resolvedRole === "admin") {
        bootstrapConsumed = true;
      }

      return resolvedRole;
    },
    readInvitation(tokenHash) {
      return invitations.get(tokenHash) ?? null;
    },
    saveInvitation(tokenHash, invitation) {
      invitations.set(tokenHash, invitation);
    },
    consumeInvitation(tokenHash, consumedAt, now) {
      const invitation = invitations.get(tokenHash);

      if (!invitation) {
        return null;
      }

      if (
        invitation.consumedAt !== null ||
        new Date(invitation.expiresAt).getTime() <= now
      ) {
        return null;
      }

      const updatedInvitation = {
        ...invitation,
        consumedAt,
      };

      invitations.set(tokenHash, updatedInvitation);

      return updatedInvitation;
    },
  };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T20:19:09.000Z"));
  });

  it("should promote only the first completed account to admin", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = service.requestMagicLink(" User@Example.com ");
    const token = new URL(request.magicLink).searchParams.get("token");

    expect(request.email).toBe("user@example.com");
    expect(request.sessionDurationDays).toBe(7);
    expect(token).toBeTruthy();

    const consumed = service.consumeMagicLink(token ?? "");
    const cookieHeader = `${consumed.cookie.name}=${consumed.cookie.value}`;
    const session = service.readSessionFromCookieHeader(cookieHeader);

    expect(consumed.redirectUrl).toBe("http://localhost:3000/login/success");
    expect(session).toMatchObject({
      email: "user@example.com",
      role: "admin",
    });
    expect(session?.expiresAt).toBe("2026-04-26T20:19:09.000Z");
  });

  it("should keep later public signups on the user role", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(service.requestMagicLink("admin@example.com").magicLink).searchParams.get(
        "token",
      ) ?? "";
    const userToken =
      new URL(service.requestMagicLink("user@example.com").magicLink).searchParams.get(
        "token",
      ) ?? "";

    service.consumeMagicLink(adminToken);
    const consumedUser = service.consumeMagicLink(userToken);
    const session = service.readSessionFromCookieHeader(
      `${consumedUser.cookie.name}=${consumedUser.cookie.value}`,
    );

    expect(session).toMatchObject({
      email: "user@example.com",
      role: "user",
    });
  });

  it("should reject an invalid email address", () => {
    const service = new AuthService(config, createInMemoryAccountStore());

    expect(() => service.requestMagicLink("not-an-email")).toThrow(/valid email/i);
  });

  it("should reject a reused or expired magic link", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = service.requestMagicLink("user@example.com");
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";

    service.consumeMagicLink(token);

    expect(() => service.consumeMagicLink(token)).toThrow(/invalid or expired/i);

    const expiredRequest = service.requestMagicLink("other@example.com");
    const expiredToken =
      new URL(expiredRequest.magicLink).searchParams.get("token") ?? "";

    vi.advanceTimersByTime(16 * 60_000);

    expect(() => service.consumeMagicLink(expiredToken)).toThrow(
      /invalid or expired/i,
    );
  });

  it("should reject tampered or expired sessions", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = service.requestMagicLink("user@example.com");
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";
    const consumed = service.consumeMagicLink(token);

    expect(
      service.readSessionFromCookieHeader(
        `${consumed.cookie.name}=${consumed.cookie.value}tampered`,
      ),
    ).toBeNull();

    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

    expect(
      service.readSessionFromCookieHeader(
        `${consumed.cookie.name}=${consumed.cookie.value}`,
      ),
    ).toBeNull();
  });

  it("should only allow redirects back to the configured app origin", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = service.requestMagicLink("user@example.com");
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";

    const external = service.consumeMagicLink(token, "https://evil.example/path");

    expect(external.redirectUrl).toBe("http://localhost:3000/login");
  });

  it("should allow an admin to create a single-use invitation that expires after 48 hours", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(service.requestMagicLink("admin@example.com").magicLink).searchParams.get(
        "token",
      ) ?? "";
    const adminSession = service.consumeMagicLink(adminToken);
    const invitation = service.createInvitation(
      `${adminSession.cookie.name}=${adminSession.cookie.value}`,
      "new-admin@example.com",
      "admin",
    );
    const invitationToken =
      new URL(invitation.invitationUrl).searchParams.get("token") ?? "";

    expect(invitation).toMatchObject({
      email: "new-admin@example.com",
      role: "admin",
      expiresAt: "2026-04-21T20:19:09.000Z",
    });
    expect(service.previewInvitation(invitationToken)).toMatchObject({
      email: "new-admin@example.com",
      role: "admin",
    });

    const consumed = service.consumeInvitation(invitationToken);
    const invitedSession = service.readSessionFromCookieHeader(
      `${consumed.cookie.name}=${consumed.cookie.value}`,
    );

    expect(invitedSession).toMatchObject({
      email: "new-admin@example.com",
      role: "admin",
    });
    expect(() => service.consumeInvitation(invitationToken)).toThrow(
      /invalid or expired/i,
    );
  });

  it("should reject invitation creation without an admin session", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(service.requestMagicLink("admin@example.com").magicLink).searchParams.get(
        "token",
      ) ?? "";

    service.consumeMagicLink(adminToken);

    expect(() =>
      service.createInvitation(undefined, "user@example.com", "user"),
    ).toThrow(/valid session/i);

    const userToken =
      new URL(service.requestMagicLink("user@example.com").magicLink).searchParams.get(
        "token",
      ) ?? "";
    const userSession = service.consumeMagicLink(userToken);

    expect(() =>
      service.createInvitation(
        `${userSession.cookie.name}=${userSession.cookie.value}`,
        "other@example.com",
        "user",
      ),
    ).toThrow(/only admins/i);
  });

  it("should reject expired invitations", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(service.requestMagicLink("admin@example.com").magicLink).searchParams.get(
        "token",
      ) ?? "";
    const adminSession = service.consumeMagicLink(adminToken);
    const invitation = service.createInvitation(
      `${adminSession.cookie.name}=${adminSession.cookie.value}`,
      "invitee@example.com",
      "user",
    );
    const invitationToken =
      new URL(invitation.invitationUrl).searchParams.get("token") ?? "";

    vi.advanceTimersByTime(48 * 60 * 60 * 1000 + 1);

    expect(() => service.previewInvitation(invitationToken)).toThrow(
      /invalid or expired/i,
    );
    expect(() => service.consumeInvitation(invitationToken)).toThrow(
      /invalid or expired/i,
    );
  });
});
