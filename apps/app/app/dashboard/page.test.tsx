import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("../auth/session", () => ({
  requireSession: requireSessionMock,
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the protected post-onboarding dashboard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await DashboardPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Tableau de bord candidat");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Reprendre l&#x27;onboarding");
  });
});
