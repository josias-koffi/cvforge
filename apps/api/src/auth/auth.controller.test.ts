import { describe, expect, it, vi } from "vitest";
import { AuthMailerService } from "./auth-mailer.service";
import type { AuthAccountStore, AuthConfig, AuthRole } from "./auth.types";
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
});
