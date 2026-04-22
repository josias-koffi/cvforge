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
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          summary: {
            respondedCount: 2,
            responseRate: 67,
            statusCounts: {
              draft: 1,
              interview_scheduled: 1,
              offer_received: 1,
              rejected: 0,
              sent: 1,
            },
            totalCount: 3,
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          applications: [
            {
              createdAt: "2026-04-20T09:00:00.000Z",
              cvGeneratedAt: null,
              extracted: {
                companyName: "Acme",
                contractType: null,
                language: "fr",
                location: "Paris",
                requirements: [],
                responsibilities: [],
                salaryRange: null,
                summary: "Resume",
                title: "Product Engineer",
              },
              id: "app-001",
              offerTextPreview: "Preview",
              offerUrl: "https://example.com/jobs/1",
              sourceLabel: "Acme",
              sourceType: "url",
              status: "sent",
              statusHistory: [
                {
                  changedAt: "2026-04-20T09:00:00.000Z",
                  status: "sent",
                },
              ],
              updatedAt: "2026-04-21T18:30:00.000Z",
              userEmail: "user@example.com",
            },
            {
              createdAt: "2026-04-18T09:00:00.000Z",
              cvGeneratedAt: null,
              extracted: {
                companyName: "Globex",
                contractType: null,
                language: "fr",
                location: "Lyon",
                requirements: [],
                responsibilities: [],
                salaryRange: null,
                summary: "Resume",
                title: "Backend Engineer",
              },
              id: "app-002",
              offerTextPreview: "Preview",
              offerUrl: "https://example.com/jobs/2",
              sourceLabel: "Globex",
              sourceType: "url",
              status: "interview_scheduled",
              statusHistory: [
                {
                  changedAt: "2026-04-18T09:00:00.000Z",
                  status: "interview_scheduled",
                },
              ],
              updatedAt: "2026-04-22T07:00:00.000Z",
              userEmail: "user@example.com",
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          credits: {
            balance: 47,
            history: [],
            isLowBalance: false,
            lowBalanceThreshold: 20,
            userEmail: "user@example.com",
          },
        }),
        ok: true,
      });

    const Page = await DashboardPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Tableau de bord candidat");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("Total candidatures");
    expect(markup).toContain("Candidatures ce mois");
    expect(markup).toContain("Taux de reponse");
    expect(markup).toContain("Reponses obtenues");
    expect(markup).toContain("Entretiens planifies");
    expect(markup).toContain("Offres recues");
    expect(markup).toContain("Credits restants");
    expect(markup).toContain("Pipeline candidature");
    expect(markup).toContain("Acces rapides");
    expect(markup).toContain("Nouvelle candidature");
    expect(markup).toContain("Mode interview");
    expect(markup).toContain("Dernieres candidatures");
    expect(markup).toContain("Product Engineer");
    expect(markup).toContain("Backend Engineer");
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
    fetchMock
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        json: async () => ({
          applications: [],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          credits: {
            balance: 0,
            history: [],
            isLowBalance: true,
            lowBalanceThreshold: 20,
            userEmail: "user@example.com",
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
