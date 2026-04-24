import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, requireSessionMock } = vi.hoisted(() => ({
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

import NotificationsPage from "./page";

describe("NotificationsPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the in-app notification feed with read and unread statuses", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          notifications: [
            {
              createdAt: "2026-04-22T08:00:00.000Z",
              id: "notif-001",
              linkHref: "/candidatures?applicationId=app-001",
              message: "Sept jours se sont ecoules depuis l'envoi de votre candidature.",
              metadata: { applicationId: "app-001" },
              readAt: null,
              title: "Relancer Acme",
              type: "application_follow_up",
              userEmail: "user@example.com",
            },
            {
              createdAt: "2026-04-20T08:00:00.000Z",
              id: "notif-002",
              linkHref: "/candidatures?applicationId=app-002",
              message: "Rappel deja consulte.",
              metadata: { applicationId: "app-002" },
              readAt: "2026-04-21T08:00:00.000Z",
              title: "Relancer Globex",
              type: "application_follow_up",
              userEmail: "user@example.com",
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          emailDeliveryReady: true,
          preferences: {
            email: {
              applicationFollowUp: true,
              creditPurchaseConfirmed: false,
            },
          },
          provider: "resend",
        }),
        ok: true,
      });

    const Page = await NotificationsPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Centre de notifications");
    expect(markup).toContain("Notifications");
    expect(markup).toContain("Relancer Acme");
    expect(markup).toContain("Relancer Globex");
    expect(markup).toContain("Preferences email");
    expect(markup).toContain("Provider configure");
    expect(markup).toContain("Relance candidature J+7");
    expect(markup).toContain("Non lue");
    expect(markup).toContain("Lue");
    expect(markup).toContain("Marquer comme lue");
  });
});
