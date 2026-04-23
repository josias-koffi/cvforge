import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("../auth/session", () => ({
  requireSession: requireSessionMock,
}));

import ProfilePage from "./page";

describe("ProfilePage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the protected unique base profile screen", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await ProfilePage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Profil de base");
    expect(markup).toContain("Profil de base unique");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("/profile/privacy");
  });
});
