import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("templates duplicate route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("duplicates the selected template through the API", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        template: { id: "template-cv-copy" },
      }),
      ok: true,
    } as Response);

    const formData = new FormData();
    formData.set("templateId", "template-cv-ats");

    const response = await POST(
      new Request("http://localhost/admin/templates/duplicate", {
        body: formData,
        headers: {
          cookie: "cvforge_session=session-token",
        },
        method: "POST",
      }),
    );

    expect(response.headers.get("location")).toContain(
      "/admin/templates?templateId=template-cv-copy&saved=1",
    );
  });
});
