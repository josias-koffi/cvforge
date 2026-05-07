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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./generate-cv-button", () => ({
  GenerateCvButton: ({ applicationId }: { applicationId: string }) => (
    <button data-testid={`gen-cv-${applicationId}`} type="button">
      Générer le CV
    </button>
  ),
}));

vi.mock("./generate-letter-button", () => ({
  GenerateLetterButton: ({ applicationId }: { applicationId: string }) => (
    <button data-testid={`gen-letter-${applicationId}`} type="button">
      Générer la LM
    </button>
  ),
}));

vi.mock("./application-profile-selector", () => ({
  ApplicationProfileSelector: () => (
    <div>Profil actif pour cette candidature</div>
  ),
}));

import ApplicationsPage from "./page";

const baseApplication = {
  createdAt: "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: "app_123",
  interviewReports: [],
  letterGeneratedAt: null,
  offerTextPreview: "Lead the backend platform.",
  offerUrl: "https://example.com/jobs/123",
  sourceLabel: "https://example.com/jobs/123",
  sourceType: "url" as const,
  status: "draft" as const,
  statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" as const }],
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
};

const baseSummary = {
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
};

describe("ApplicationsPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders KPI cards and table with applications", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ applications: [baseApplication] }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ summary: baseSummary }),
        ok: true,
      });

    const Page = await ApplicationsPage({
      searchParams: Promise.resolve({ created: "app_123" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Candidatures");
    expect(markup).toContain("Backend Engineer");
    expect(markup).toContain("Example Corp");
    expect(markup).toContain("Brouillon");
    expect(markup).toContain("app_123");
    expect(markup).toContain("Brouillon cree pour user@example.com");
    expect(markup).toContain("+ Nouvelle candidature");
    expect(markup).toContain("Poste");
    expect(markup).toContain("Entreprise");
    expect(markup).toContain("Score entretien");
  });

  it("renders the extraction error banner", async () => {
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
            statusCounts: { draft: 0, interview_scheduled: 0, offer_received: 0, rejected: 0, sent: 0 },
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
  });

  it("renders the pasted-text validation error banner", async () => {
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
            statusCounts: { draft: 0, interview_scheduled: 0, offer_received: 0, rejected: 0, sent: 0 },
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

  it("renders the status update success banner", async () => {
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
            statusCounts: { draft: 0, interview_scheduled: 1, offer_received: 0, rejected: 0, sent: 0 },
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

  it("renders empty state when no applications", async () => {
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
            statusCounts: { draft: 0, interview_scheduled: 0, offer_received: 0, rejected: 0, sent: 0 },
            totalCount: 0,
          },
        }),
        ok: true,
      });

    const Page = await ApplicationsPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Aucune candidature ne correspond");
    expect(markup).toContain("+ Nouvelle candidature");
  });
});
