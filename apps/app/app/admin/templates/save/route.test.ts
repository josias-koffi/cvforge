import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("templates save route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("forwards template updates to the API and redirects back to the editor", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        template: { id: "template-cv-ats" },
      }),
      ok: true,
    } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");
    formData.set("name", "CV ATS revisé");
    formData.set("kind", "cv");
    formData.set("locale", "fr");
    formData.set("categories", "ATS, Moderne");
    formData.set("active", "on");
    formData.set("isDefault", "on");
    formData.set(
      "layout",
      JSON.stringify({
        blocks: [],
      }),
    );

    const response = await POST(
      new Request("http://localhost/admin/templates/save", {
        body: formData,
        headers: {
          cookie: "cvforge_session=session-token",
        },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain(
      "/admin/templates?templateId=template-cv-ats&saved=1",
    );
  });

  it("rejects invalid layout JSON before calling the API", async () => {
    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");
    formData.set("layout", "{");

    const response = await POST(
      new Request("http://localhost/admin/templates/save", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain(
      "error=template_invalid_layout",
    );
  });
});
