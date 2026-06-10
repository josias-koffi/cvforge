import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  requireSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("../../auth-config", () => ({
  getServerApiUrl: () => "http://api.test",
}));

import CvPage from "./page";

describe("CvPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  const cvContent = {
    candidate: {
      city: "Paris",
      email: "jane@example.com",
      firstName: "Jean",
      github: "github.com/jean",
      lastName: "Dupont",
      linkedin: "linkedin.com/in/jean",
      phone: "+33612345678",
      summary: "Expert TypeScript developer",
      title: "Senior Developer",
    },
    certifications: [],
    education: [],
    experiences: [],
    interests: "",
    languages: [],
    projects: [],
    skills: { hard: ["TypeScript"], soft: ["Communication"] },
  };

  function setupMocks() {
    requireSessionMock.mockResolvedValue({
      email: "user@test.example",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "session-token" }],
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ cvContent }),
        ok: true,
        status: 200,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          versions: [
            {
              content: cvContent,
              createdAt: "2026-04-23T10:00:00.000Z",
              id: "app-001-cv-v1",
              source: "generation",
              templateId: "template-cv-ats",
              versionNumber: 1,
            },
          ],
        }),
        ok: true,
        status: 200,
      } as Response);
  }

  it("renders the CV editor page with structured fields", async () => {
    setupMocks();

    const Page = await CvPage({
      params: Promise.resolve({ applicationId: "app-001" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Edition du CV");
    expect(markup).toContain("Edition WYSIWYG du CV");
    expect(markup).toContain("Sauvegarder le CV");
    expect(markup).toContain("Télécharger le PDF");
    expect(markup).toContain("Télécharger le DOCX");
    expect(markup).toContain("Historique des versions CV");
  });

  it("renders the live preview with candidate data", async () => {
    setupMocks();

    const Page = await CvPage({
      params: Promise.resolve({ applicationId: "app-001" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Jean");
    expect(markup).toContain("TypeScript");
  });

  it("shows structured edit fields", async () => {
    setupMocks();

    const Page = await CvPage({
      params: Promise.resolve({ applicationId: "app-001" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Compétences techniques");
    expect(markup).toContain("Aperçu PDF");
  });
});
