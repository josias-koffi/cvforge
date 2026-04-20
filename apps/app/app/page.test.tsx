import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("./auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("should render the protected onboarding wizard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await HomePage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Onboarding candidat");
    expect(markup).toContain("Wizard d&#x27;onboarding en 5 etapes");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Informations personnelles");
    expect(markup).toContain("Recapitulatif &amp; validation");
    expect(markup).toContain("Sections principales");
  });
});
