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
    });

    const Page = await ApplicationsPage({
      searchParams: { created: "app_123" },
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Candidatures");
    expect(markup).toContain("Importer une offre");
    expect(markup).toContain("Fallback texte");
    expect(markup).toContain("Import PDF MVP");
    expect(markup).toContain("Backend Engineer");
    expect(markup).toContain("app_123");
  });

  it("renders the extraction error state", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({ applications: [] }),
      ok: true,
    });

    const Page = await ApplicationsPage({
      searchParams: { error: "invalid_url", url: "bad-url" },
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
    fetchMock.mockResolvedValue({
      json: async () => ({ applications: [] }),
      ok: true,
    });

    const Page = await ApplicationsPage({
      searchParams: { error: "invalid_text" },
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Collez le texte integral de l&#x27;offre");
  });
});
