import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("./auth/session", () => ({
  requireSession: requireSessionMock,
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("should render the protected dashboard content", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await HomePage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("CVforge App");
    expect(markup).toContain("PWA candidat initialis");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Tableau de bord");
    expect(markup).toContain("Sections principales");
    expect(markup).toContain("zone admin protegee");
  });
});
