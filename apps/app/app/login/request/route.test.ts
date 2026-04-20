import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /login/request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should redirect to the check-email page when the API returns a magic link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          email: "user@example.com",
          expiresAt: "2026-04-19T20:34:09.000Z",
          sessionDurationDays: 7,
        }),
        ok: true,
      }),
    );

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("consentAccepted", "true");

    const response = await POST(
      new Request("http://localhost:3000/login/request", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("/login/check-email?");
    expect(response.headers.get("location")).toContain("user%40example.com");
    expect(response.headers.get("location")).toContain("sessionDurationDays=7");
  });

  it("should redirect back to the login page when the API request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("consentAccepted", "true");

    const response = await POST(
      new Request("http://localhost:3000/login/request", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=request_failed",
    );
  });

  it("should reject a missing consent checkbox before calling the API", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("email", "user@example.com");

    const response = await POST(
      new Request("http://localhost:3000/login/request", {
        body: formData,
        method: "POST",
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=consent_required",
    );
  });
});
