import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, requireSessionMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  requireSessionMock: vi.fn(),
}));

vi.mock("./auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("redirects authenticated users to the dashboard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    await HomePage();

    expect(requireSessionMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
