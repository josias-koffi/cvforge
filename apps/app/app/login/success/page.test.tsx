import { describe, expect, it, vi } from "vitest";

const { redirectMock, requireSessionMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  requireSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

import LoginSuccessPage from "./page";

describe("LoginSuccessPage", () => {
  it("redirects a valid session to the dashboard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-06-17T12:00:00.000Z",
      role: "user",
    });

    await LoginSuccessPage();

    expect(requireSessionMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
