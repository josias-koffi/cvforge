import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  requireSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [{ name: "cvforge_session", value: "session-token" }],
  }),
}));

vi.mock("../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

describe("ProfilePrivacyPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the privacy export and retention screen", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-30T00:00:00.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        policy: {
          audioPurgePlan: {
            execution: "Daily purge job at 03:00 UTC once interview audio storage ships.",
            retentionDays: 30,
            scope: "Interview audio files and derived transcripts stored in MinIO.",
            status: "planned",
          },
          documentedAt: "2026-04-23",
          rules: [
            {
              action: "Immediate deletion after confirmed self-service request.",
              automation: "Implemented in the MVP privacy delete flow.",
              dataType: "Account identity",
              retention: "Retained only while the account remains active.",
            },
          ],
        },
      }),
      ok: true,
    } as Response);

    const { default: ProfilePrivacyPage } = await import("./page");
    const Page = await ProfilePrivacyPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Confidentialite et RGPD");
    expect(markup).toContain("Telecharger mon export");
    expect(markup).toContain("Suppression irreversible du compte");
    expect(markup).toContain("Retention: Retained only while the account remains active.");
  });
});
