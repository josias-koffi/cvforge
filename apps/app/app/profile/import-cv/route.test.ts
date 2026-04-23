import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /profile/import-cv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies the uploaded CV to the API extraction endpoint", async () => {
    const payload = {
      extractedProfile: {
        headline: "Senior Developer",
        identity: {
          city: "Paris",
          firstName: "Jean",
          github: "",
          linkedIn: "",
          portfolio: "",
        },
        sections: {
          certifications: [],
          education: [],
          experiences: [],
          interests: "",
          personalProjects: [],
          softSkills: [],
          summary: "Experienced developer",
          technicalSkills: ["TypeScript"],
        },
      },
      omittedFields: ["identity.email"],
      qualityLimits: ["Relire les dates."],
      source: {
        filename: "cv.pdf",
        mimeType: "application/pdf",
        textLength: 240,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => payload,
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("cvFile", new File(["content"], "cv.pdf", { type: "application/pdf" }));

    const response = await POST(
      new Request("http://localhost:3000/profile/import-cv", {
        body: formData,
        headers: { cookie: "cvforge_session=abc" },
        method: "POST",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/applications/cv-import/extract",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(await response.json()).toEqual(payload);
  });

  it("returns a stable error message when the API rejects the file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
      }),
    );

    const formData = new FormData();
    formData.set("cvFile", new File(["short"], "cv.pdf", { type: "application/pdf" }));

    const response = await POST(
      new Request("http://localhost:3000/profile/import-cv", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message: "Le CV ne contient pas assez de texte exploitable.",
    });
  });
});
