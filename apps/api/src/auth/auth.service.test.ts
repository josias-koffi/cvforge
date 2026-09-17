import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryAccountStore } from "./testing/in-memory-account-store";
import { AuthService } from "./auth.service";
import type { AuthConfig } from "./auth.types";

const config: AuthConfig = {
  apiUrl: "http://localhost:3333",
  appUrl: "http://localhost:3000",
  magicLinkTtlMinutes: 15,
  sessionTtlDays: 7,
  cookieName: "cvforge_session",
  cookieDomain: undefined,
  sessionSecret: "test-secret",
  secureCookies: false,
};

describe("AuthService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T20:19:09.000Z"));
  });

  it("should promote only the first completed account to admin", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = await service.requestMagicLink(" User@Example.com ", true);
    const token = new URL(request.magicLink).searchParams.get("token");

    expect(request.email).toBe("user@example.com");
    expect(request.sessionDurationDays).toBe(7);
    expect(token).toBeTruthy();

    const consumed = await service.consumeMagicLink(token ?? "");
    const cookieHeader = `${consumed.cookie.name}=${consumed.cookie.value}`;
    const session = service.readSessionFromCookieHeader(cookieHeader);

    expect(consumed.redirectUrl).toBe("http://localhost:3000/login/success");
    expect(session).toMatchObject({
      email: "user@example.com",
      role: "admin",
    });
    expect(session?.expiresAt).toBe("2026-04-26T20:19:09.000Z");
  });

  it("should keep later public signups on the user role", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(
        (await service.requestMagicLink("admin@example.com", true)).magicLink,
      ).searchParams.get(
        "token",
      ) ?? "";
    const userToken =
      new URL(
        (await service.requestMagicLink("user@example.com", true)).magicLink,
      ).searchParams.get(
        "token",
      ) ?? "";

    await service.consumeMagicLink(adminToken);
    const consumedUser = await service.consumeMagicLink(userToken);
    const session = service.readSessionFromCookieHeader(
      `${consumedUser.cookie.name}=${consumedUser.cookie.value}`,
    );

    expect(session).toMatchObject({
      email: "user@example.com",
      role: "user",
    });
  });

  it("should reject an invalid email address", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());

    await expect(service.requestMagicLink("not-an-email", true)).rejects.toThrow(/valid email/i);
  });

  it("should require consent before creating a new public account", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());

    await expect(service.requestMagicLink("user@example.com", false)).rejects.toThrow(/consent/i);
  });

  it("should reject a reused or expired magic link", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = await service.requestMagicLink("user@example.com", true);
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";

    await service.consumeMagicLink(token);

    await expect(service.consumeMagicLink(token)).rejects.toThrow(/invalid or expired/i);

    const expiredRequest = await service.requestMagicLink("other@example.com", true);
    const expiredToken =
      new URL(expiredRequest.magicLink).searchParams.get("token") ?? "";

    vi.advanceTimersByTime(16 * 60_000);

    await expect(service.consumeMagicLink(expiredToken)).rejects.toThrow(
      /invalid or expired/i,
    );
  });

  it("should reject tampered or expired sessions", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = await service.requestMagicLink("user@example.com", true);
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";
    const consumed = await service.consumeMagicLink(token);

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

  it("should only allow redirects back to the configured app origin", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const request = await service.requestMagicLink("user@example.com", true);
    const token = new URL(request.magicLink).searchParams.get("token") ?? "";

    const external = await service.consumeMagicLink(token, "https://evil.example/path");

    expect(external.redirectUrl).toBe("http://localhost:3000/login");
  });

  it("should allow an admin to create a single-use invitation that expires after 48 hours", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(
        (await service.requestMagicLink("admin@example.com", true)).magicLink,
      ).searchParams.get(
        "token",
      ) ?? "";
    const adminSession = await service.consumeMagicLink(adminToken);
    const invitation = await service.createInvitation(
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
    expect(await service.previewInvitation(invitationToken)).toMatchObject({
      email: "new-admin@example.com",
      role: "admin",
    });

    const consumed = await service.consumeInvitation(invitationToken, true);
    const invitedSession = service.readSessionFromCookieHeader(
      `${consumed.cookie.name}=${consumed.cookie.value}`,
    );

    expect(invitedSession).toMatchObject({
      email: "new-admin@example.com",
      role: "admin",
    });
    await expect(service.consumeInvitation(invitationToken, true)).rejects.toThrow(
      /invalid or expired/i,
    );
  });

  it("should reject invitation creation without an admin session", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(
        (await service.requestMagicLink("admin@example.com", true)).magicLink,
      ).searchParams.get(
        "token",
      ) ?? "";

    await service.consumeMagicLink(adminToken);

    await expect(service.createInvitation(undefined, "user@example.com", "user")).rejects.toThrow(/valid session/i);

    const userToken =
      new URL(
        (await service.requestMagicLink("user@example.com", true)).magicLink,
      ).searchParams.get(
        "token",
      ) ?? "";
    const userSession = await service.consumeMagicLink(userToken);

    await expect(service.createInvitation(
        `${userSession.cookie.name}=${userSession.cookie.value}`,
        "other@example.com",
        "user",
      )).rejects.toThrow(/only admins/i);
  });

  it("should reject expired invitations", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(
        (await service.requestMagicLink("admin@example.com", true)).magicLink,
      ).searchParams.get(
        "token",
      ) ?? "";
    const adminSession = await service.consumeMagicLink(adminToken);
    const invitation = await service.createInvitation(
      `${adminSession.cookie.name}=${adminSession.cookie.value}`,
      "invitee@example.com",
      "user",
    );
    const invitationToken =
      new URL(invitation.invitationUrl).searchParams.get("token") ?? "";

    vi.advanceTimersByTime(48 * 60 * 60 * 1000 + 1);

    await expect(service.previewInvitation(invitationToken)).rejects.toThrow(
      /invalid or expired/i,
    );
    await expect(service.consumeInvitation(invitationToken, true)).rejects.toThrow(
      /invalid or expired/i,
    );
  });

  it("should require consent before consuming an invitation", async () => {
    const service = new AuthService(config, createInMemoryAccountStore());
    const adminToken =
      new URL(
        (await service.requestMagicLink("admin@example.com", true)).magicLink,
      ).searchParams.get("token") ?? "";
    const adminSession = await service.consumeMagicLink(adminToken);
    const invitation = await service.createInvitation(
      `${adminSession.cookie.name}=${adminSession.cookie.value}`,
      "invitee@example.com",
      "user",
    );
    const invitationToken =
      new URL(invitation.invitationUrl).searchParams.get("token") ?? "";

    await expect(service.consumeInvitation(invitationToken, false)).rejects.toThrow(/consent/i);
  });

  it("should update account roles while keeping at least one admin", async () => {
    const store = createInMemoryAccountStore();
    const service = new AuthService(config, store);

    store.resolveRole("admin@example.com");
    store.resolveRole("user@example.com");

    expect(await service.updateAccountRole("USER@example.com", "admin")).toMatchObject({
      email: "user@example.com",
      role: "admin",
    });
    expect(await service.updateAccountRole("admin@example.com", "user")).toMatchObject({
      role: "user",
    });
    await expect(service.updateAccountRole("user@example.com", "user")).rejects.toThrow(
      /dernier administrateur/,
    );
    await expect(service.updateAccountRole("user@example.com", "owner")).rejects.toThrow(
      /role/,
    );
    await expect(service.updateAccountRole("ghost@example.com", "user")).rejects.toThrow(
      /introuvable/,
    );
  });
});
