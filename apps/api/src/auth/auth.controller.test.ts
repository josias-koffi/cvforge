import { describe, expect, it, vi } from "vitest";
import { AuthMailerService } from "./auth-mailer.service";
import type {
  AuthAccountStore,
  AuthConfig,
  AuthInvitation,
  AuthRole,
} from "./auth.types";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

const config: AuthConfig = {
  apiUrl: "http://localhost:3333",
  appUrl: "http://localhost:3000",
  magicLinkTtlMinutes: 15,
  sessionTtlDays: 7,
  cookieName: "cvforge_session",
  sessionSecret: "test-secret",
  secureCookies: false,
  stateFilePath: "/tmp/cvforge-auth-state-controller-test.json",
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

describe("AuthController", () => {
  it("should issue an email-backed magic link, set a session cookie, and read the session", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const mailer = {
      sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthMailerService;
    const controller = new AuthController(service, mailer);
    const request = await controller.requestMagicLink({ email: "user@example.com" });
    const sendCall = vi.mocked(mailer.sendMagicLinkEmail).mock.calls[0]?.[0];
    const token = sendCall ? new URL(sendCall.magicLink).searchParams.get("token") ?? "" : "";
    const cookie = vi.fn();
    const redirect = vi.fn();

    controller.consumeMagicLink(token, undefined, {
      cookie,
      redirect,
    } as never);

    const [cookieName, cookieValue] = cookie.mock.calls[0] as [string, string];
    const session = controller.readSession({
      headers: {
        cookie: `${cookieName}=${cookieValue}`,
      },
    } as never);

    expect(mailer.sendMagicLinkEmail).toHaveBeenCalledTimes(1);
    expect(request).toMatchObject({
      email: "user@example.com",
      sessionDurationDays: 7,
    });
    expect(redirect).toHaveBeenCalledWith(
      302,
      "http://localhost:3000/login/success",
    );
    expect(session).toMatchObject({
      authenticated: true,
      session: {
        email: "user@example.com",
        role: "admin",
      },
    });
  });

  it("should expose auth email health", () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const mailer = {
      getHealth: vi.fn().mockReturnValue({
        emailFromConfigured: true,
        ready: true,
        smtpEnabled: true,
      }),
      sendMagicLinkEmail: vi.fn(),
    } as unknown as AuthMailerService;
    const controller = new AuthController(service, mailer);

    expect(controller.getEmailHealth()).toEqual({
      emailFromConfigured: true,
      ready: true,
      smtpEnabled: true,
    });
  });

  it("should create and consume an admin invitation through the controller", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const mailer = {
      sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
      getHealth: vi.fn(),
    } as unknown as AuthMailerService;
    const controller = new AuthController(service, mailer);
    const request = await controller.requestMagicLink({ email: "admin@example.com" });
    const sendCall = vi.mocked(mailer.sendMagicLinkEmail).mock.calls[0]?.[0];
    const adminToken =
      sendCall ? new URL(sendCall.magicLink).searchParams.get("token") ?? "" : "";
    const loginCookie = vi.fn();
    const loginRedirect = vi.fn();

    controller.consumeMagicLink(adminToken, undefined, {
      cookie: loginCookie,
      redirect: loginRedirect,
    } as never);

    const [cookieName, cookieValue] = loginCookie.mock.calls[0] as [string, string];
    const invitation = controller.createInvitation(
      {
        email: "invitee@example.com",
        role: "admin",
      },
      {
        headers: {
          cookie: `${cookieName}=${cookieValue}`,
        },
      } as never,
    );
    const invitationToken =
      new URL(invitation.invitationUrl).searchParams.get("token") ?? "";
    const consumeCookie = vi.fn();

    expect(request.email).toBe("admin@example.com");
    expect(controller.previewInvitation(invitationToken)).toMatchObject({
      email: "invitee@example.com",
      role: "admin",
    });
    expect(
      controller.readAdminSession({
        headers: {
          cookie: `${cookieName}=${cookieValue}`,
        },
      } as never),
    ).toMatchObject({
      authenticated: true,
      session: {
        email: "admin@example.com",
        role: "admin",
      },
    });

    const consumed = controller.consumeInvitation(
      { token: invitationToken },
      {
        cookie: consumeCookie,
      } as never,
    );

    expect(invitation).toMatchObject({
      email: "invitee@example.com",
      role: "admin",
    });
    expect(consumed.session).toMatchObject({
      email: "invitee@example.com",
      role: "admin",
    });
  });
});
