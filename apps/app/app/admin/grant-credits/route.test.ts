import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("admin grant-credits route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("posts a manual grant and redirects back to the admin panel", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const formData = new FormData();
    formData.set("userEmail", "user@example.com");
    formData.set("credits", "25");
    formData.set("note", "Support commercial");
    formData.set("page", "2");
    formData.set("query", "example");
    formData.set("role", "user");

    const response = await POST(
      new Request("http://localhost/admin/grant-credits", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain(
      "/admin?page=2&query=example&role=user&granted=user%40example.com",
    );

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string> },
    ];

    expect(url).toContain("/credits/admin/grants");
    expect(JSON.parse(options.body)).toEqual({
      credits: 25,
      note: "Support commercial",
      userEmail: "user@example.com",
    });
    expect(options.headers.cookie).toBe("cvforge_session=session-token");
  });

  it("rejects missing users before calling the API", async () => {
    const formData = new FormData();
    formData.set("credits", "25");
    formData.set("note", "Support commercial");

    const response = await POST(
      new Request("http://localhost/admin/grant-credits", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=user_missing");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("redirects with an error when the API rejects the grant", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 422 } as Response);

    const formData = new FormData();
    formData.set("userEmail", "user@example.com");
    formData.set("credits", "25");
    formData.set("note", " ");

    const response = await POST(
      new Request("http://localhost/admin/grant-credits", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=grant_failed");
    expect(response.headers.get("location")).toContain("granted=user%40example.com");
  });
});
