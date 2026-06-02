import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("../../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

import EditProfilePage from "./page";

describe("EditProfilePage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the profile editor for a given profile id", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });

    const Page = await EditProfilePage({ params: Promise.resolve({ id: "profile-abc" }) });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Modifier le profil");
    expect(markup).toContain("Retour aux profils");
    expect(markup).toContain("/profile");
  });
});
