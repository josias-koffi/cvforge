import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, fetchMock } = vi.hoisted(() => ({
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

import ApplicationsPage from "./page";

describe("ApplicationsPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the protected candidature import screen", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      ok: true,
    });
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          applications: [
            {
              createdAt: "2026-04-20T12:00:00.000Z",
              id: "app_123",
              offerTextPreview: "Lead the backend platform.",
              offerUrl: "https://example.com/jobs/123",
              sourceLabel: "https://example.com/jobs/123",
              sourceType: "url",
              status: "draft",
              statusHistory: [
                {
                  changedAt: "2026-04-20T12:00:00.000Z",
                  status: "draft",
                },
              ],
              updatedAt: "2026-04-20T12:00:00.000Z",
              userEmail: "user@example.com",
              extracted: {
                companyName: "Example Corp",
                contractType: "CDI",
                language: "fr",
                location: "Paris",
                requirements: ["Node.js"],
                responsibilities: ["Build APIs"],
                salaryRange: null,
                summary: "Platform role.",
                title: "Backend Engineer",
              },
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          summary: {
            respondedCount: 0,
            responseRate: 0,
            statusCounts: {
              draft: 1,
              interview_scheduled: 0,
              offer_received: 0,
              rejected: 0,
              sent: 0,
            },
            totalCount: 1,
          },
        }),
        ok: true,
      });

    const Page = await ApplicationsPage({
      searchParams: Promise.resolve({ created: "app_123" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Candidatures");
    expect(markup).toContain("Importer une offre");
    expect(markup).toContain("Fallback texte");
    expect(markup).toContain("Import PDF MVP");
    expect(markup).toContain("Backend Engineer");
    expect(markup).toContain("app_123");
    expect(markup).toContain("Brouillon");
    expect(markup).toContain("Marquer comme envoyee");
    expect(markup).toContain("Profil actif pour cette candidature");
    expect(markup).toContain("Historique des statuts");
  });

  it("renders the extraction error state", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ applications: [] }),
        ok: true,
      })
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
      });

    const Page = await ApplicationsPage({
      searchParams: Promise.resolve({ error: "invalid_url", url: "bad-url" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("L&#x27;URL fournie est invalide");
    expect(markup).toContain("bad-url");
  });

  it("renders the pasted-text validation error state", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ applications: [] }),
        ok: true,
      })
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
      });

    const Page = await ApplicationsPage({
      searchParams: Promise.resolve({ error: "invalid_text" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Collez le texte integral de l&#x27;offre");
  });

  it("renders the status update success state", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ applications: [] }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          summary: {
            respondedCount: 1,
            responseRate: 100,
            statusCounts: {
              draft: 0,
              interview_scheduled: 1,
              offer_received: 0,
              rejected: 0,
              sent: 0,
            },
            totalCount: 1,
          },
        }),
        ok: true,
      });

    const Page = await ApplicationsPage({
      searchParams: Promise.resolve({ statusUpdated: "app_123" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Statut mis a jour pour la candidature app_123");
  });
});
