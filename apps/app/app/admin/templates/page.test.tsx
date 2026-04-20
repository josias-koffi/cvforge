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

  it("renders the ATS templates editor for an admin", async () => {
    requireAdminSessionMock.mockResolvedValue({
      email: "admin@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "admin",
    });
    cookiesMock.mockResolvedValue({
      getAll: () => [
        {
          name: "cvforge_session",
          value: "session-token",
        },
      ],
    });
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        templates: [
          {
            active: true,
            categories: ["ATS"],
            createdAt: "2026-04-20T00:00:00.000Z",
            id: "template-cv-ats",
            isDefault: true,
            kind: "cv",
            layout: {
              blocks: [
                {
                  id: "cv-header",
                  name: "CVHeader",
                  props: {
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
            },
            locale: "fr",
            name: "CV ATS par defaut",
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
              blocks: [],
            },
            locale: "fr",
            name: "LM ATS par defaut",
            updatedAt: "2026-04-20T00:00:00.000Z",
          },
        ],
      }),
      ok: true,
    } as Response);

    const Page = await AdminTemplatesPage({
      searchParams: Promise.resolve({ templateId: "template-cv-ats" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Templates admin");
    expect(markup).toContain("CV ATS par defaut");
    expect(markup).toContain("LM ATS par defaut");
    expect(markup).toContain("Editeur Puck");
    expect(markup).toContain("Apercu live");
    expect(markup).toContain("CVHeader");
  });
});
