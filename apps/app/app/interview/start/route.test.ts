import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

import { POST } from "./route";

describe("POST /interview/start", () => {
  it("proxies interview-session creation to the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          session: {
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
            status: "idle",
            transcript: "",
            updatedAt: "2026-04-24T13:00:00.000Z",
          },
          sessionId: "session-001",
        }),
        ok: true,
      }),
    );

    const response = await POST(
      new Request("http://localhost/interview/start", {
        body: JSON.stringify({ language: "fr", profile: "technical" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/interviews/sessions",
      expect.objectContaining({
        body: JSON.stringify({ language: "fr", profile: "technical" }),
        method: "POST",
      }),
    );
    expect(await response.json()).toEqual({
      session: {
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
        status: "idle",
        transcript: "",
        updatedAt: "2026-04-24T13:00:00.000Z",
      },
      sessionId: "session-001",
    });
  });
});
