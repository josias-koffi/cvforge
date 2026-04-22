import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import { GET } from "./route";

describe("GET /notifications/summary", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "cookie-token" }],
    });
    globalThis.fetch = vi.fn();
  });

  it("proxies the backend summary using the current session cookie", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        summary: {
          unreadCount: 2,
        },
      }),
      status: 200,
    } as Response);

    const response = await GET();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://localhost:3333/notifications/summary",
      {
        cache: "no-store",
        headers: {
          cookie: "cvforge_session=cookie-token",
        },
      },
    );
    expect(response.status).toBe(200);
  });
});
