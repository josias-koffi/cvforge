import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, requireSessionMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  requireSessionMock: vi.fn(),
}));

vi.mock("../auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: "cvforge_session", value: "cookie-value" }],
  }),
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the protected post-onboarding dashboard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        summary: {
          respondedCount: 2,
          responseRate: 67,
          statusCounts: {
            draft: 1,
            interview_scheduled: 1,
            offer_received: 0,
            rejected: 0,
            sent: 1,
          },
          totalCount: 3,
        },
      }),
      ok: true,
    });

    const Page = await DashboardPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Tableau de bord candidat");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Total candidatures");
    expect(markup).toContain("Taux de reponse");
    expect(markup).toContain("Pipeline candidature");
    expect(markup).toContain("Acheter des credits");
    expect(markup).toContain("Ouvrir la page Mes credits");
    expect(markup).toContain("Pack Starter");
    expect(markup).toContain("Pack Pro");
    expect(markup).toContain("Ouvrir le pipeline de candidatures");
    expect(markup).toContain("Ouvrir le profil de base");
    expect(markup).toContain("Reprendre l&#x27;onboarding");
  });

  it("renders a billing status banner when checkout returns to the dashboard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        summary: {
          respondedCount: 0,
          responseRate: 0,
          statusCounts: {
            draft: 0,
            interview_scheduled: 0,
            offer_received: 0,
            rejected: 0,
            sent: 0,
          },
          totalCount: 0,
        },
      }),
      ok: true,
    });

    const Page = await DashboardPage({
      searchParams: Promise.resolve({
        billing: "cancelled",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Le paiement a ete annule avant confirmation Stripe.");
  });
});
