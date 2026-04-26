import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

import { GET } from "./route";

describe("GET /interview/[sessionId]", () => {
  it("proxies interview session reads to the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          aiResponse: null,
          aiResponseGeneratedAt: null,
          aiStatus: "idle",
          chunks: [],
          completedAt: null,
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-001",
          language: "fr",
          lastError: null,
          profile: "standard",
          recoverable: true,
          status: "ready",
          transcript: "bonjour",
          updatedAt: "2026-04-24T13:01:00.000Z",
        }),
        ok: true,
      }),
    );

    const response = await GET(new Request("http://localhost/interview/session-001"), {
      params: Promise.resolve({ sessionId: "session-001" }),
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/interviews/sessions/session-001",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(await response.json()).toEqual({
      aiResponse: null,
      aiResponseGeneratedAt: null,
      aiStatus: "idle",
      chunks: [],
      completedAt: null,
      createdAt: "2026-04-24T13:00:00.000Z",
      id: "session-001",
      language: "fr",
      lastError: null,
      profile: "standard",
      recoverable: true,
      status: "ready",
      transcript: "bonjour",
      updatedAt: "2026-04-24T13:01:00.000Z",
    });
  });
});
