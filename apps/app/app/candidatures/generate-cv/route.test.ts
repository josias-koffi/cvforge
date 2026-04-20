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

describe("POST /candidatures/generate-cv route", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cvContent: {} }),
    });
  });

  it("calls the API generate-cv endpoint with the correct path", async () => {
    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: JSON.stringify(VALID_BODY),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/applications/app-001/generate-cv",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does NOT forward localFields.lastName, phone, or email in the route body to the API prompt", async () => {
    const request = new Request("http://app.test/candidatures/generate-cv", {
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

  it("returns 400 when applicationId is missing", async () => {
    const { applicationId: _id, ...withoutId } = VALID_BODY;
    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: JSON.stringify(withoutId),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns error status when API call fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: "Contenu insuffisant." }),
    });

    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: JSON.stringify(VALID_BODY),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(422);
    expect(body.message).toBe("Contenu insuffisant.");
  });

  it("returns applicationId on success", async () => {
    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: JSON.stringify(VALID_BODY),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request);
    const body = (await response.json()) as { applicationId: string };

    expect(response.status).toBe(200);
    expect(body.applicationId).toBe("app-001");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: "not json",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("uses fallback promptProfile when not provided in body", async () => {
    const bodyWithoutProfile = {
      applicationId: "app-001",
      localFields: VALID_BODY.localFields,
    };
    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: JSON.stringify(bodyWithoutProfile),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const [, options] = mockFetch.mock.lastCall as [string, { body: string }];
    const sent = JSON.parse(options.body) as { promptProfile: { identity: { firstName: string } } };
    expect(sent.promptProfile.identity.firstName).toBe("");
  });

  it("returns 500 when API error response has no parseable JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("Not JSON"); },
    });

    const request = new Request("http://app.test/candidatures/generate-cv", {
      body: JSON.stringify(VALID_BODY),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const response = await POST(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(500);
    expect(body.message).toBe("La génération du CV a échoué.");
  });
});
