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

import LetterPage from "./page";

describe("LetterPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  const letterContent = {
    body: {
      paragraph1: "Bonjour, je vous adresse ma candidature.",
      paragraph2: "Mon experience correspond aux enjeux du poste.",
      paragraph3: "Je serais ravi d'echanger avec vous.",
    },
    candidate: {
      city: "Paris",
      email: "jane@example.com",
      firstName: "Jane",
      github: "github.com/jane",
      lastName: "Doe",
      linkedin: "linkedin.com/in/jane",
      phone: "+33612345678",
      title: "Senior Product Engineer",
    },
    company: {
      city: "Lyon",
      name: "Example Corp",
    },
    date: "2026-04-20",
    object: "Candidature au poste de Senior Product Engineer",
    signature: {
      firstName: "Jane",
      lastName: "Doe",
    },
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
        json: async () => ({ letterContent }),
        ok: true,
        status: 200,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          versions: [
            {
              content: letterContent,
              createdAt: "2026-04-23T10:00:00.000Z",
              id: "app-001-letter-v1",
              source: "generation",
              templateId: "template-letter-ats",
              versionNumber: 1,
            },
          ],
        }),
        ok: true,
        status: 200,
      } as Response);
  }

  it("renders the default LM ATS editor and preview", async () => {
    setupMocks();

    const Page = await LetterPage({
      params: Promise.resolve({ applicationId: "app-001" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Edition de la LM");
    expect(markup).toContain("Edition WYSIWYG de la LM");
    expect(markup).toContain("Template LM ATS par défaut");
    expect(markup).toContain("Aperçu PDF");
    expect(markup).toContain('data-document-preview="pdf"');
    expect(markup).toContain("Example Corp");
    expect(markup).toContain("Telecharger le DOCX");
    expect(markup).toContain("Historique des versions LM");
  });
});
