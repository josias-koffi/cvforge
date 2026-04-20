import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSessionMock, cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  requireAdminSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../auth/session", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

import AdminTemplatesPage from "./page";

describe("AdminTemplatesPage", () => {
  beforeEach(() => {
    requireAdminSessionMock.mockReset();
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  const mockTemplates = [
    {
      active: true,
      categories: ["ATS"],
      createdAt: "2026-04-20T00:00:00.000Z",
      id: "template-cv-ats",
      isDefault: true,
      kind: "cv",
      layout: {
        content: [
          {
            type: "CVHeader",
            props: {
              id: "cv-header",
              city: "Paris",
              email: "jane@example.com",
              firstName: "Jane",
              github: "github.com/janedoe",
              lastName: "Doe",
              linkedin: "linkedin.com/in/janedoe",
              phone: "+33 6 00 00 00 00",
              title: "Senior Product Engineer",
            },
          },
        ],
        root: { props: {} },
      },
      locale: "fr",
      name: "CV ATS par defaut",
      updatedAt: "2026-04-20T00:00:00.000Z",
    },
    {
      active: false,
      categories: ["Moderne"],
      createdAt: "2026-04-20T00:00:00.000Z",
      id: "template-cv-moderne",
      isDefault: false,
      kind: "cv",
      layout: { content: [], root: { props: {} } },
      locale: "fr",
      name: "CV Moderne",
      updatedAt: "2026-04-20T00:00:00.000Z",
    },
    {
      active: true,
      categories: ["ATS"],
      createdAt: "2026-04-20T00:00:00.000Z",
      id: "template-letter-ats",
      isDefault: true,
      kind: "letter",
      layout: {
        content: [
          { type: "LMHeader", props: { id: "lm-header" } },
          { type: "LMBody", props: { id: "lm-body" } },
          { type: "LMSignature", props: { id: "lm-sig" } },
        ],
        root: { props: {} },
      },
      locale: "fr",
      name: "LM ATS par defaut",
      updatedAt: "2026-04-20T00:00:00.000Z",
    },
  ];

  function setupMocks() {
    requireAdminSessionMock.mockResolvedValue({
      email: "admin@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "admin",
    });
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "session-token" }],
    });
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ templates: mockTemplates }),
      ok: true,
    } as Response);
  }

  it("renders the ATS templates editor for an admin", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Templates admin");
    expect(markup).toContain("CV ATS par defaut");
    expect(markup).toContain("LM ATS par defaut");
    expect(markup).toContain("Editeur Puck");
    expect(markup).toContain("Aperçu live");
    expect(markup).toContain("CVHeader");
  });

  it("shows filter chips and inline action buttons on template cards", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Dupliquer");
    expect(markup).toContain("Désactiver");
    expect(markup).toContain("Activer");
    expect(markup).toContain("Supprimer");
    expect(markup).toContain("Définir par défaut");
    expect(markup).toContain("filterKind=cv");
    expect(markup).toContain("filterKind=letter");
    expect(markup).toContain("filterActive=active");
    expect(markup).toContain("filterActive=inactive");
  });

  it("marks the default template with the gold badge", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Défaut");
    expect(markup).toContain("#C8A96E");
  });

  it("filters templates by kind when filterKind is set", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ filterKind: "cv", templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("CV ATS par defaut");
    expect(markup).toContain("CV Moderne");
    expect(markup).not.toContain("LM ATS par defaut");
  });

  it("shows predefined category suggestions in the editor form", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Moderne");
    expect(markup).toContain("Minimaliste");
    expect(markup).toContain("Créatif");
  });

  it("injects CV fixture data into the live preview for a CV template", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Jean Dupont");
    expect(markup).toContain("Chef de projet IT");
    expect(markup).toContain("Données fictives injectées");
    expect(markup).toContain("EB Garamond");
  });

  it("injects letter fixture data into the live preview for a letter template", async () => {
    setupMocks();

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-letter-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("InnoTech Solutions");
    expect(markup).toContain("Données fictives injectées");
  });
});
