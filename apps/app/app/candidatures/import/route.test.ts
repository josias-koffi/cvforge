import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /candidatures/import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects back with the created draft id on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          application: {
            id: "app_123",
          },
        }),
        ok: true,
      }),
    );

    const formData = new FormData();
    formData.set("sourceType", "url");
    formData.set("offerUrl", "https://example.com/jobs/123");

    const response = await POST(
      new Request("http://localhost:3000/candidatures/import", {
        body: formData,
        headers: {
          cookie: "cvforge_session=abc",
        },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures?created=app_123",
    );
  });

  it("maps backend validation failures to a stable page error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
      }),
    );

    const formData = new FormData();
    formData.set("sourceType", "url");
    formData.set("offerUrl", "https://example.com/jobs/123");

    const response = await POST(
      new Request("http://localhost:3000/candidatures/import", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures?url=https%3A%2F%2Fexample.com%2Fjobs%2F123&error=unprocessable",
    );
  });

  it("forwards pasted text imports to the dedicated API endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        application: {
          id: "app_text_123",
        },
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("sourceType", "text");
    formData.set(
      "offerText",
      "Senior backend role with enough detail to satisfy the threshold and support candidature creation safely.",
    );

    const response = await POST(
      new Request("http://localhost:3000/candidatures/import", {
        body: formData,
        method: "POST",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/applications/import-from-text",
      expect.objectContaining({
        body: JSON.stringify({
          offerText:
            "Senior backend role with enough detail to satisfy the threshold and support candidature creation safely.",
        }),
      }),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures?created=app_text_123",
    );
  });

  it("maps invalid pasted text to a dedicated page error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      }),
    );

    const formData = new FormData();
    formData.set("sourceType", "text");
    formData.set("offerText", "   ");

    const response = await POST(
      new Request("http://localhost:3000/candidatures/import", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/candidatures?error=invalid_text",
    );
  });
});
