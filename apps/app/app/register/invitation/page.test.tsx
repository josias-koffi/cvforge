import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import InvitationPage from "./page";

describe("InvitationPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should render the invitation acceptance details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          email: "invitee@example.com",
          expiresAt: "2026-04-22T06:55:06.000Z",
          role: "admin",
        }),
        ok: true,
      }),
    );

    const Page = await InvitationPage({
      searchParams: Promise.resolve({
        token: "token-123",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Invitation admin");
    expect(markup).toContain("invitee@example.com");
    expect(markup).toContain('action="/register/invitation/accept"');
    expect(markup).toContain("usage unique");
  });

  it("should render the invalid invitation state when preview fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const Page = await InvitationPage({
      searchParams: Promise.resolve({
        token: "expired-token",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Invitation invalide");
  });
});
