import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("AuthService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T20:19:09.000Z"));
  });

  it("should issue a magic link and create a signed session on consumption", () => {
    const service = new AuthService(config);
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
      role: "user",
    });
    expect(session?.expiresAt).toBe("2026-04-26T20:19:09.000Z");
  });

  it("should reject an invalid email address", () => {
    const service = new AuthService(config);

    expect(() => service.requestMagicLink("not-an-email")).toThrow(/valid email/i);
  });

  it("should reject a reused or expired magic link", () => {
    const service = new AuthService(config);
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
    const service = new AuthService(config);
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
    const service = new AuthService(config);
    const request = service.requestMagicLink("user@example.com");
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";

    const external = service.consumeMagicLink(token, "https://evil.example/path");

    expect(external.redirectUrl).toBe("http://localhost:3000/login");
  });
});
