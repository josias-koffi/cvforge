import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

import { POST } from "./route";

describe("POST /interview/[sessionId]/finish", () => {
  it("proxies interview completion to the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          aiResponse: "Merci pour cet entretien.",
          aiResponseGeneratedAt: "2026-04-24T13:10:00.000Z",
          aiStatus: "done",
          chunks: [],
          completedAt: "2026-04-24T13:12:00.000Z",
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-001",
          language: "fr",
          lastError: null,
          profile: "standard",
          recoverable: false,
          status: "completed",
          transcript: "bonjour",
          updatedAt: "2026-04-24T13:12:00.000Z",
        }),
        ok: true,
        status: 200,
      }),
    );

    const response = await POST(
      new Request("http://localhost/interview/session-001/finish", {
        method: "POST",
      }),
      { params: Promise.resolve({ sessionId: "session-001" }) },
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/interviews/sessions/session-001/finish",
      expect.objectContaining({ method: "POST" }),
    );
    expect((await response.json()).status).toBe("completed");
  });
});
