import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("templates set-default route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("sets a template as default and redirects back", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-moderne");

    const response = await POST(
      new Request("http://localhost/admin/templates/set-default", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain(
      "/admin/templates?templateId=template-cv-moderne",
    );
    expect(response.headers.get("location")).not.toContain("error");

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, { body: string }];

    expect(url).toContain("template-cv-moderne");
    expect(JSON.parse(options.body)).toEqual({ isDefault: true });
  });

  it("redirects with error when API fails", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-moderne");

    const response = await POST(
      new Request("http://localhost/admin/templates/set-default", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=template_save_failed");
  });

  it("redirects with error when templateId is missing", async () => {
    const formData = new FormData();

    const response = await POST(
      new Request("http://localhost/admin/templates/set-default", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=template_missing");
  });
});
