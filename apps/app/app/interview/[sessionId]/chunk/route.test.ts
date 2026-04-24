import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

import { POST } from "./route";

const VALID_CHUNK = {
  chunkBase64: "UklGRiQAAABXQVZF",
  chunkId: "chunk-001",
  endedAt: "2026-04-24T13:00:00.500Z",
  format: "webm",
  isFinal: false,
  mimeType: "audio/webm",
  sequence: 1,
  startedAt: "2026-04-24T13:00:00.000Z",
};

describe("POST /interview/[sessionId]/chunk", () => {
  it("proxies chunk payloads to the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          chunks: [],
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-001",
          lastError: null,
          recoverable: true,
          status: "recording",
          transcript: "bonjour",
          updatedAt: "2026-04-24T13:00:00.500Z",
        }),
        ok: true,
      }),
    );

    const response = await POST(
      new Request("http://localhost/interview/session-001/chunk", {
        body: JSON.stringify(VALID_CHUNK),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      {
        params: Promise.resolve({ sessionId: "session-001" }),
      },
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/interviews/sessions/session-001/chunks",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await response.json()).toMatchObject({
      transcript: "bonjour",
    });
  });

  it("rejects invalid JSON payloads", async () => {
    const response = await POST(
      new Request("http://localhost/interview/session-001/chunk", {
        body: "not json",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      {
        params: Promise.resolve({ sessionId: "session-001" }),
      },
    );

    expect(response.status).toBe(400);
  });
});
