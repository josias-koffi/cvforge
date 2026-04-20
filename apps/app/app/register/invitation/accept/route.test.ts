import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /register/invitation/accept", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should redirect to the login success page and forward the session cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: new Headers({
          "set-cookie": "cvforge_session=test; Path=/; HttpOnly",
        }),
        ok: true,
      }),
    );

    const formData = new FormData();

    formData.set("token", "token-123");

    const response = await POST(
      new Request("http://localhost:3000/register/invitation/accept", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login/success",
    );
    expect(response.headers.get("set-cookie")).toContain("cvforge_session=test");
  });

  it("should redirect back to the invitation page when the API rejects the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const formData = new FormData();

    formData.set("token", "expired-token");

    const response = await POST(
      new Request("http://localhost:3000/register/invitation/accept", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/register/invitation?token=expired-token&error=consume_failed",
    );
  });
});
