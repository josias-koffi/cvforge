import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, requireAdminSessionMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  requireAdminSessionMock: vi.fn(),
}));

vi.mock("../auth/session", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: "cvforge_session", value: "cookie-value" }],
  }),
}));

import AdminPage from "./page";

describe("AdminPage", () => {
  beforeEach(() => {
    requireAdminSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("should render the admin area for an authenticated admin", async () => {
    requireAdminSessionMock.mockResolvedValue({
      email: "admin@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "admin",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        filters: {
          query: "user",
          role: "user",
        },
        pagination: {
          page: 1,
          pageSize: 6,
          totalItems: 1,
          totalPages: 1,
        },
        requestedBy: "admin@example.com",
        users: [
          {
            balance: 47,
            consent: {
              acceptedAt: "2026-04-21T08:00:00.000Z",
              source: "passwordless",
              version: "2026-04-mvp",
            },
            email: "user@example.com",
            lastActivityAt: "2026-04-22T09:00:00.000Z",
            lastManualGrant: {
              adminEmail: "admin@example.com",
              amount: 25,
              createdAt: "2026-04-22T09:00:00.000Z",
              note: "Support commercial",
            },
            ledgerEntryCount: 3,
            role: "user",
          },
        ],
      }),
      ok: true,
    });

    const Page = await AdminPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Espace admin");
    expect(markup).toContain("admin@example.com");
    expect(markup).toContain("Filtres utilisateurs");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Attribuer des credits");
    expect(markup).toContain("Support commercial");
    expect(markup).toContain("Chaque attribution manuelle entre dans le ledger");
  });

  it("renders success feedback after a manual grant", async () => {
    requireAdminSessionMock.mockResolvedValue({
      email: "admin@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "admin",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        filters: {
          query: "",
          role: "all",
        },
        pagination: {
          page: 1,
          pageSize: 6,
          totalItems: 0,
          totalPages: 1,
        },
        requestedBy: "admin@example.com",
        users: [],
      }),
      ok: true,
    });

    const Page = await AdminPage({
      searchParams: Promise.resolve({
        granted: "user@example.com",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain(
      "Attribution de credits enregistree pour user@example.com.",
    );
  });
});
