import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSessionMock } = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
}));

vi.mock("../auth/session", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

import AdminPage from "./page";

describe("AdminPage", () => {
  beforeEach(() => {
    requireAdminSessionMock.mockReset();
  });

  it("should render the admin area for an authenticated admin", async () => {
    requireAdminSessionMock.mockResolvedValue({
      email: "admin@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "admin",
    });

    const Page = await AdminPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Espace admin");
    expect(markup).toContain("admin@example.com");
    expect(markup).toContain("reservee au role admin");
  });
});
