import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import NewProfilePage from "./page";

describe("NewProfilePage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the profile creation form", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await NewProfilePage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Nouveau profil");
    expect(markup).toContain("Creer un profil");
    expect(markup).toContain("/profile");
  });
});
