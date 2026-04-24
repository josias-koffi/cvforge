import { afterEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, redirectMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  redirectMock: vi.fn((target: string) => {
    throw new Error(`redirect:${target}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { requireAdminSession, requireSession } from "./session";

describe("app auth session guards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should pass the current cookie header when reading a protected session", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [
        {
          name: "cvforge_session",
          value: "signed-session",
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          authenticated: true,
          session: {
            email: "user@example.com",
            expiresAt: "2026-04-27T07:45:24.000Z",
            role: "user",
          },
        }),
        ok: true,
        status: 200,
      }),
    );

    const session = await requireSession();

    expect(session).toMatchObject({
      email: "user@example.com",
      role: "user",
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost:3333/auth/session", {
      cache: "no-store",
      headers: {
        cookie: "cvforge_session=signed-session",
      },
    });
  });

  it("should redirect unauthenticated users to login for protected routes", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    await expect(requireSession()).rejects.toThrow(
      "redirect:/login?error=session_required",
    );
  });

  it("should redirect non-admin users away from admin routes", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [
        {
          name: "cvforge_session",
          value: "signed-session",
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    await expect(requireAdminSession()).rejects.toThrow("redirect:/forbidden");
  });

  it("should redirect to login when the session API is unreachable", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [],
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(requireSession()).rejects.toThrow(
      "redirect:/login?error=session_unavailable",
    );
  });

  it("should redirect to login when the session API returns a server error", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(requireSession()).rejects.toThrow(
      "redirect:/login?error=session_unavailable",
    );
  });
});
