import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("templates toggle-active route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("deactivates a template and redirects back", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");
    formData.set("active", "false");

    const response = await POST(
      new Request("http://localhost/admin/templates/toggle-active", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain(
      "/admin/templates?templateId=template-cv-ats",
    );
    expect(response.headers.get("location")).not.toContain("error");

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, { body: string }];

    expect(url).toContain("template-cv-ats");
    expect(JSON.parse(options.body)).toEqual({ active: false });
  });

  it("activates a template and redirects back", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");
    formData.set("active", "true");

    await POST(
      new Request("http://localhost/admin/templates/toggle-active", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, { body: string }];

    expect(JSON.parse(options.body)).toEqual({ active: true });
  });

  it("redirects with error when API fails", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");
    formData.set("active", "false");

    const response = await POST(
      new Request("http://localhost/admin/templates/toggle-active", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=template_save_failed");
  });
});
