import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /candidatures/status", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects back with the updated candidature id on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    const formData = new FormData();
    formData.set("applicationId", "app_123");
    formData.set("nextStatus", "sent");

    const response = await POST(
      new Request("http://localhost:3000/candidatures/status", {
        body: formData,
        headers: {
          cookie: "cvforge_session=abc",
        },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures?statusUpdated=app_123",
    );
  });

  it("redirects back to the provided candidature detail path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    const formData = new FormData();
    formData.set("applicationId", "app_123");
    formData.set("nextStatus", "sent");
    formData.set("returnTo", "/candidatures/app_123");

    const response = await POST(
      new Request("http://localhost:3000/candidatures/status", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures/app_123?statusUpdated=app_123",
    );
  });

  it("maps forbidden transitions to a stable page error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
      }),
    );

    const formData = new FormData();
    formData.set("applicationId", "app_123");
    formData.set("nextStatus", "draft");

    const response = await POST(
      new Request("http://localhost:3000/candidatures/status", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures?error=status_transition_forbidden",
    );
  });
});
