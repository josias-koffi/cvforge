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
            chunks: [],
            createdAt: "2026-04-24T13:00:00.000Z",
            id: "session-001",
            lastError: null,
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

    const response = await POST();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/interviews/sessions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await response.json()).toEqual({
      session: {
        chunks: [],
        createdAt: "2026-04-24T13:00:00.000Z",
        id: "session-001",
        lastError: null,
        recoverable: true,
        status: "idle",
        transcript: "",
        updatedAt: "2026-04-24T13:00:00.000Z",
      },
      sessionId: "session-001",
    });
  });
});
