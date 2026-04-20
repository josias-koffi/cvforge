import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("templates delete route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("deletes the template and redirects to the library", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");

    const response = await POST(
      new Request("http://localhost/admin/templates/delete", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("/admin/templates");
    expect(response.headers.get("location")).not.toContain("error");
  });

  it("redirects with error when template not found", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const formData = new FormData();
    formData.set("templateId", "missing-template");

    const response = await POST(
      new Request("http://localhost/admin/templates/delete", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=template_delete_failed");
  });

  it("redirects with last-default error when API returns 409", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
    } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-only");

    const response = await POST(
      new Request("http://localhost/admin/templates/delete", {
        body: formData,
        headers: { cookie: "cvforge_session=session-token" },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=template_last_default");
  });

  it("redirects with error when templateId is absent", async () => {
    const formData = new FormData();

    const response = await POST(
      new Request("http://localhost/admin/templates/delete", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain("error=template_missing");
  });
});
