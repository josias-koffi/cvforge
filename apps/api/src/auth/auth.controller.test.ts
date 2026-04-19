import { describe, expect, it, vi } from "vitest";
import { AuthMailerService } from "./auth-mailer.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import type { AuthConfig } from "./auth.types";

const config: AuthConfig = {
  apiUrl: "http://localhost:3333",
  appUrl: "http://localhost:3000",
  magicLinkTtlMinutes: 15,
  sessionTtlDays: 7,
  cookieName: "cvforge_session",
  sessionSecret: "test-secret",
  secureCookies: false,
};

describe("AuthController", () => {
  it("should issue an email-backed magic link, set a session cookie, and read the session", async () => {
    const service = new AuthService(config);
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
      },
    });
  });

  it("should expose auth email health", () => {
    const service = new AuthService(config);
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
