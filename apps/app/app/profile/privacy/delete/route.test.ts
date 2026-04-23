import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("profile privacy delete route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("deletes the account through the API and clears the auth cookie", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        result: {
          deletedAt: "2026-04-23T08:10:10.000Z",
        },
      }),
      ok: true,
      status: 200,
    } as Response);

    const response = await POST(
      new Request("http://localhost/profile/privacy/delete", {
        body: JSON.stringify({ confirmationEmail: "user@example.com" }),
        headers: {
          "content-type": "application/json",
          cookie: "cvforge_session=session-token",
        },
        method: "POST",
      }),
    );

    expect(response.cookies.get("cvforge_session")?.value).toBe("");
    expect((await response.json()).redirectUrl).toContain("/login?accountDeleted=1");
  });

  it("maps API validation errors to a stable app error code", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
    } as Response);

    const response = await POST(
      new Request("http://localhost/profile/privacy/delete", {
        body: JSON.stringify({ confirmationEmail: "other@example.com" }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(await response.json()).toEqual({
      error: "confirmation_mismatch",
    });
  });
});
