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

describe("letter save route", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    globalThis.fetch = vi.fn();
  });

  it("forwards letter updates to the API and returns the saved content", async () => {
    cookiesMock.mockResolvedValue({
      getAll: () => [{ name: "cvforge_session", value: "session-token" }],
    });
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        letterContent: {
          body: { paragraph1: "Bonjour", paragraph2: "Suite", paragraph3: "Fin" },
          candidate: {
            city: "Paris",
            email: "user@test.example",
            firstName: "Jean",
            github: "",
            lastName: "Dupont",
            linkedin: "",
            phone: "+33612345678",
            title: "Senior Developer",
          },
          company: { city: "Paris", name: "Acme" },
          date: "2026-04-20",
          object: "Candidature",
          signature: { firstName: "Jean", lastName: "Dupont" },
        },
      }),
      ok: true,
      status: 200,
    } as Response);

    const request = new Request("http://localhost/letters/app-001/save", {
      body: JSON.stringify({
        letterContent: {
          body: { paragraph1: "Bonjour", paragraph2: "Suite", paragraph3: "Fin" },
          candidate: {
            city: "Paris",
            email: "user@test.example",
            firstName: "Jean",
            github: "",
            lastName: "Dupont",
            linkedin: "",
            phone: "+33612345678",
            title: "Senior Developer",
          },
          company: { city: "Paris", name: "Acme" },
          date: "2026-04-20",
          object: "Candidature",
          signature: { firstName: "Jean", lastName: "Dupont" },
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

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://api.test/applications/app-001/letter",
      expect.objectContaining({ method: "PUT" }),
    );
    const payload = (await response.json()) as {
      letterContent: { company: { name: string } };
    };
    expect(payload.letterContent.company.name).toBe("Acme");
  });
});
