import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock } = vi.hoisted(() => ({
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

import InterviewPage from "./page";

describe("InterviewPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
  });

  it("renders the protected interview streaming workspace", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          applications: [
            {
              createdAt: "2026-04-24T13:00:00.000Z",
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
              status: "interview_scheduled",
              statusHistory: [
                {
                  changedAt: "2026-04-24T13:00:00.000Z",
                  status: "interview_scheduled",
                },
              ],
              updatedAt: "2026-04-24T13:00:00.000Z",
              userEmail: "user@example.com",
            },
          ],
        }),
        ok: true,
      }),
    );

    const Page = await InterviewPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Interview vocal");
    expect(markup).toContain("Streaming STT progressif");
    expect(markup).toContain("Demarrer l&#x27;entretien");
    expect(markup).toContain("Rapport post-entretien");
    expect(markup).toContain("Transcription partielle");
  });
});
