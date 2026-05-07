import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: "cvforge_session", value: "cookie-value" }],
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/interview/new",
}));

import InterviewNewPage from "./page";

const MOCK_APPLICATION = {
  createdAt: "2026-04-24T13:00:00.000Z",
  cvGeneratedAt: null,
  extracted: {
    companyName: "Acme Corp",
    contractType: null,
    language: "fr",
    location: "Paris",
    requirements: [],
    responsibilities: [],
    salaryRange: null,
    summary: "Description",
    title: "Product Engineer",
  },
  id: "app-001",
  offerTextPreview: "Preview",
  offerUrl: "https://example.com",
  sourceLabel: "Acme",
  sourceType: "url",
  status: "interview_scheduled",
  statusHistory: [{ changedAt: "2026-04-24T13:00:00.000Z", status: "interview_scheduled" }],
  updatedAt: "2026-04-24T13:00:00.000Z",
  userEmail: "user@example.com",
};

describe("InterviewNewPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the setup wizard", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-06-01T00:00:00.000Z",
      role: "user",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ applications: [MOCK_APPLICATION] }),
        ok: true,
      }),
    );

    const Page = await InterviewNewPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Préparer un entretien");
    expect(markup).toContain("Candidature");
    expect(markup).toContain("Profil");
    expect(markup).toContain("Paramètres");
  });

  it("pre-selects candidature from ?candidatureId= param", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-06-01T00:00:00.000Z",
      role: "user",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ applications: [MOCK_APPLICATION] }),
        ok: true,
      }),
    );

    const Page = await InterviewNewPage({
      searchParams: Promise.resolve({ candidatureId: "app-001" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Préparer un entretien");
  });

  it("ignores unknown candidatureId param", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-06-01T00:00:00.000Z",
      role: "user",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ applications: [MOCK_APPLICATION] }),
        ok: true,
      }),
    );

    const Page = await InterviewNewPage({
      searchParams: Promise.resolve({ candidatureId: "unknown-id" }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Préparer un entretien");
  });
});
