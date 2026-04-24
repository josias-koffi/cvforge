import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

import { GET } from "./route";

describe("GET /interview/[sessionId]/respond", () => {
  it("proxies SSE stream from the API and forwards event-stream headers", async () => {
    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"chunk","text":"Hello"}\n\n'),
        );
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        body: sseBody,
        ok: true,
        status: 200,
      }),
    );

    const response = await GET(
      new Request("http://localhost/interview/session-001/respond"),
      { params: Promise.resolve({ sessionId: "session-001" }) },
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3333/interviews/sessions/session-001/respond",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("returns 500 when the API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        body: null,
        ok: false,
        status: 500,
      }),
    );

    const response = await GET(
      new Request("http://localhost/interview/session-001/respond"),
      { params: Promise.resolve({ sessionId: "session-001" }) },
    );

    expect(response.status).toBe(500);
  });
});
