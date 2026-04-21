import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: "cvforge_session", value: "cookie-value" }],
  }),
}));

vi.mock("../../auth-config", () => ({
  getAppUrl: () => "http://app.test",
  getServerApiUrl: () => "http://api.test",
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { POST } = await import("./route");

describe("POST /credits/checkout route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("redirects to Stripe Checkout when the API returns a checkout URL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        checkoutUrl: "https://checkout.stripe.com/c/session_123",
        sessionId: "cs_test_123",
      }),
    });

    const formData = new FormData();
    formData.set("packId", "starter");
    const request = new Request("http://app.test/credits/checkout", {
      body: formData,
      method: "POST",
    });

    const response = await POST(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/billing/checkout-sessions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(response.headers.get("location")).toBe(
      "https://checkout.stripe.com/c/session_123",
    );
  });

  it("redirects back to the dashboard when the pack is invalid", async () => {
    const formData = new FormData();
    formData.set("packId", "enterprise");
    const request = new Request("http://app.test/credits/checkout", {
      body: formData,
      method: "POST",
    });

    const response = await POST(request);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://app.test/dashboard?billing=error&reason=invalid_pack",
    );
  });

  it("redirects back to the dashboard when checkout creation fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        message: "Stripe indisponible.",
      }),
    });

    const formData = new FormData();
    formData.set("packId", "pro");
    const request = new Request("http://app.test/credits/checkout", {
      body: formData,
      method: "POST",
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe(
      "http://app.test/dashboard?billing=error&reason=Stripe+indisponible.",
    );
  });
});
