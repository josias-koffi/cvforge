import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: "cvforge_session", value: "cookie-value" }],
  }),
}));

import { POST } from "./route";

describe("POST /notifications/preferences", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards the checkbox preferences to the API then redirects back", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const formData = new FormData();
    formData.set("applicationFollowUp", "on");

    const response = await POST(
      new Request("http://localhost:3000/notifications/preferences", {
        body: formData,
        method: "POST",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/notifications/preferences",
      expect.objectContaining({
        body: JSON.stringify({
          email: {
            applicationFollowUp: true,
            creditPurchaseConfirmed: false,
          },
        }),
        method: "POST",
      }),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/notifications?updated=preferences",
    );
  });
});
