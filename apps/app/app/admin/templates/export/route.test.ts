import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../../auth-config", () => ({
  getServerApiUrl: () => "http://api.test",
}));

import { GET } from "./route";

describe("GET /admin/templates/export", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  it("proxies the CSV export from the API", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "session-token" }],
    });
    vi.mocked(fetch).mockResolvedValue({
      headers: new Headers({
        "content-disposition": 'attachment; filename="admin-templates-export.csv"',
        "content-type": "text/csv; charset=utf-8",
      }),
      ok: true,
      text: async () => "templateId,name\ncv-1,CV ATS\n",
    } as Response);

    const response = await GET();

    expect(fetch).toHaveBeenCalledWith("http://api.test/templates/export.csv", {
      headers: { cookie: "cvforge_session=session-token" },
    });
    expect(await response.text()).toContain("cv-1,CV ATS");
    expect(response.headers.get("content-type")).toContain("text/csv");
  });
});
