import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("profile privacy export route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("proxies the authenticated privacy export", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        exportData: {
          userEmail: "user@example.com",
        },
      }),
      ok: true,
      status: 200,
    } as Response);

    const response = await GET(
      new Request("http://localhost/profile/privacy/export", {
        headers: { cookie: "cvforge_session=session-token" },
      }),
    );

    expect(await response.json()).toEqual({
      exportData: {
        userEmail: "user@example.com",
      },
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("/privacy/export");
  });
});
