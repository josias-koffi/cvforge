import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { PrivacyController } from "./privacy.controller";
import type { PrivacyService } from "./privacy.service";

describe("PrivacyController", () => {
  it("exports user data for an authenticated session", () => {
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        expiresAt: "2026-04-30T00:00:00.000Z",
        role: "user",
      }),
    } as unknown as AuthService;
    const privacyService = {
      exportUserData: vi.fn().mockReturnValue({ userEmail: "user@example.com" }),
    } as unknown as PrivacyService;
    const controller = new PrivacyController(privacyService, authService);

    expect(
      controller.exportUserData({
        headers: {
          cookie: "cvforge_session=test",
        },
      } as never),
    ).toEqual({
      exportData: {
        userEmail: "user@example.com",
      },
    });
  });

  it("clears the session cookie after account deletion", () => {
    const authService = {
      clearSessionCookie: vi.fn().mockReturnValue({
        name: "cvforge_session",
        options: { maxAge: 0, path: "/" },
        value: "",
      }),
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        expiresAt: "2026-04-30T00:00:00.000Z",
        role: "user",
      }),
    } as unknown as AuthService;
    const privacyService = {
      deleteUserData: vi.fn().mockReturnValue({
        deletedAt: "2026-04-23T08:10:10.000Z",
      }),
    } as unknown as PrivacyService;
    const controller = new PrivacyController(privacyService, authService);
    const cookie = vi.fn();

    expect(
      controller.deleteAccount(
        {
          confirmationEmail: "user@example.com",
        },
        {
          headers: {
            cookie: "cvforge_session=test",
          },
        } as never,
        { cookie } as never,
      ),
    ).toEqual({
      result: {
        deletedAt: "2026-04-23T08:10:10.000Z",
      },
    });
    expect(cookie).toHaveBeenCalledWith("cvforge_session", "", {
      maxAge: 0,
      path: "/",
    });
  });
});
