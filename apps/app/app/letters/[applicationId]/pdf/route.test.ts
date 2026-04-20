import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../../auth-config", () => ({
  getServerApiUrl: () => "http://api.test",
}));

describe("letter pdf route", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  it("forwards the letter PDF download to the API", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "session-token" }],
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          "content-disposition": 'attachment; filename="letter.pdf"',
          "content-type": "application/pdf",
        },
        status: 200,
      }),
    );

    const response = await GET(new Request("http://localhost/letters/app-001/pdf"), {
      params: Promise.resolve({ applicationId: "app-001" }),
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://api.test/applications/app-001/letter/pdf",
      expect.objectContaining({ headers: { cookie: "cvforge_session=session-token" } }),
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });
});
