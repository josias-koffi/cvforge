import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("../../../auth-config", () => ({
  getServerApiUrl: () => "http://api.test",
}));

describe("cv save route", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  it("forwards CV updates to the API and returns the saved content", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "session-token" }],
    });
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        cvContent: {
          candidate: {
            city: "Paris",
            email: "user@test.example",
            firstName: "Jean",
            github: "",
            lastName: "Dupont",
            linkedin: "",
            phone: "+33612345678",
            summary: "Updated",
            title: "Senior Developer",
          },
          certifications: [],
          education: [],
          experiences: [],
          interests: "",
          languages: [],
          projects: [],
          skills: { hard: [], soft: [] },
        },
      }),
      ok: true,
      status: 200,
    } as Response);

    const request = new Request("http://localhost/cv/app-001/save", {
      body: JSON.stringify({
        cvContent: {
          candidate: {
            city: "Paris",
            email: "user@test.example",
            firstName: "Jean",
            github: "",
            lastName: "Dupont",
            linkedin: "",
            phone: "+33612345678",
            summary: "Updated",
            title: "Senior Developer",
          },
          certifications: [],
          education: [],
          experiences: [],
          interests: "",
          languages: [],
          projects: [],
          skills: { hard: [], soft: [] },
        },
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    });

    const response = await PUT(request, {
      params: Promise.resolve({ applicationId: "app-001" }),
    });

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://api.test/applications/app-001/cv",
      expect.objectContaining({
        method: "PUT",
      }),
    );
    const payload = (await response.json()) as {
      cvContent: { candidate: { summary: string } };
    };
    expect(payload.cvContent.candidate.summary).toBe("Updated");
  });

  it("rejects missing cvContent before calling the API", async () => {
    const request = new Request("http://localhost/cv/app-001/save", {
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    });

    const response = await PUT(request, {
      params: Promise.resolve({ applicationId: "app-001" }),
    });

    expect(response.status).toBe(400);
  });
});
