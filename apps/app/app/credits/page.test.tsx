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

import CreditsPage from "./page";

describe("CreditsPage", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders the current balance, purchase history, and usage history", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        credits: {
          balance: 47,
          history: [
            {
              action: "stripe_purchase",
              amount: 550,
              balanceAfter: 550,
              createdAt: "2026-04-21T12:00:00.000Z",
              id: "entry-001",
              metadata: {
                packId: "starter",
                stripeCheckoutSessionId: "cs_test_123",
              },
              note: "Achat Stripe starter (999 cents)",
              type: "stripe_purchase",
              userEmail: "user@example.com",
            },
            {
              action: "cv_generation",
              amount: -3,
              balanceAfter: 47,
              createdAt: "2026-04-21T14:00:00.000Z",
              id: "entry-002",
              metadata: {
                applicationId: "app_123",
              },
              note: "Generation CV",
              type: "ai_usage",
              userEmail: "user@example.com",
            },
          ],
          isLowBalance: false,
          lowBalanceThreshold: 20,
          userEmail: "user@example.com",
        },
      }),
      ok: true,
    });

    const Page = await CreditsPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Mes credits");
    expect(markup).toContain("47 credits");
    expect(markup).toContain("Pack Starter");
    expect(markup).toContain("Achat confirme");
    expect(markup).toContain("Consommation IA");
    expect(markup).toContain("Solde apres: 47 credits");
    expect(markup).toContain("Voir la candidature liee");
    expect(markup).toContain("Acheter le pack Pro");
  });

  it("renders the low-balance warning when the threshold is crossed", async () => {
    requireSessionMock.mockResolvedValue({
      email: "user@example.com",
      expiresAt: "2026-04-27T07:45:24.000Z",
      role: "user",
    });
    fetchMock.mockResolvedValue({
      json: async () => ({
        credits: {
          balance: 12,
          history: [],
          isLowBalance: true,
          lowBalanceThreshold: 20,
          userEmail: "user@example.com",
        },
      }),
      ok: true,
    });

    const Page = await CreditsPage();
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Solde bas: il reste 12 credits.");
    expect(markup).toContain("Recharge recommandee sous 20 credits");
  });
});
