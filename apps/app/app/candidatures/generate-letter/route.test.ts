import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

vi.mock("../../auth-config", () => ({
  getServerApiUrl: () => "http://api.test",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { POST } = await import("./route");

const VALID_BODY = {
  applicationId: "app-001",
  localFields: { email: "user@test.example", lastName: "Dupont", phone: "+33612345678" },
  promptProfile: {
    headline: "Senior Developer",
    identity: { candidateToken: "[CANDIDATE]", city: "Paris", firstName: "Jean" },
    profileSections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
    },
  },
};

describe("POST /candidatures/generate-letter route", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ letterContent: {} }),
    });
  });

  it("calls the API generate-letter endpoint with the correct path", async () => {
    const request = new Request("http://app.test/candidatures/generate-letter", {
      body: JSON.stringify(VALID_BODY),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/applications/app-001/generate-letter",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("preserves the pseudonymised prompt shape", async () => {
    const request = new Request("http://app.test/candidatures/generate-letter", {
      body: JSON.stringify(VALID_BODY),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await POST(request);

    const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
    const sent = JSON.parse(options.body) as { promptProfile: { identity: Record<string, unknown> } };

    expect(sent.promptProfile.identity).not.toHaveProperty("lastName");
    expect(sent.promptProfile.identity).not.toHaveProperty("email");
    expect(sent.promptProfile.identity).not.toHaveProperty("phone");
  });
});
