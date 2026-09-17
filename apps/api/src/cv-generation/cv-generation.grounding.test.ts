import { UnprocessableEntityException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";
import type { CreditsService } from "../credits/credits.service";
import type { TemplatesStore } from "../templates/templates.types";
import {
  VALID_CV_JSON,
  makeRequest,
  makeStoredApplication,
} from "./cv-generation.fixtures";
import { CvGenerationService } from "./cv-generation.service";

let store: ApplicationsStore;
let openRouter: { chat: ReturnType<typeof vi.fn> };
let creditsService: CreditsService;
let service: CvGenerationService;

beforeEach(() => {
  const app = makeStoredApplication();

  store = {
    createDraft: vi.fn(),
    deleteByUserEmail: vi.fn().mockReturnValue(0),
    findById: vi.fn().mockReturnValue(app),
    findByIdForUserEmail: vi.fn().mockReturnValue(app),
    listAll: vi.fn().mockReturnValue([app]),
    listByUserEmail: vi.fn().mockReturnValue([app]),
    save: vi.fn().mockImplementation((a: StoredApplication) => a),
  };
  openRouter = { chat: vi.fn().mockResolvedValue(JSON.stringify(VALID_CV_JSON)) };
  creditsService = {
    assertSufficientCredits: vi.fn(),
    consumeCredits: vi.fn(),
  } as unknown as CreditsService;
  const templatesStore: Pick<TemplatesStore, "list"> = { list: vi.fn().mockReturnValue([]) };

  service = new CvGenerationService(
    store,
    openRouter as never,
    creditsService,
    templatesStore,
  );
});

describe("CvGenerationService grounding and billing", () => {
  it("refuses a profile with nothing to build on, without calling the AI", async () => {
    const request = makeRequest({
      promptProfile: {
        headline: "",
        identity: {
          candidateToken: "[CANDIDATE]",
          city: "Paris",
          firstName: "Jean",
        },
        profileSections: {
          certifications: [],
          education: [],
          experiences: [],
          interests: "",
          languages: [],
          personalProjects: [],
          softSkills: [],
          summary: "",
          technicalSkills: [],
        },
      },
    });

    await expect(
      service.generateCv("user@test.example", "app-001", request),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(openRouter.chat).not.toHaveBeenCalled();
    expect(creditsService.consumeCredits).not.toHaveBeenCalled();
  });

  it("does not charge for a generation the AI botched", async () => {
    openRouter.chat.mockResolvedValue("désolé, je ne peux pas répondre");

    await expect(
      service.generateCv("user@test.example", "app-001", makeRequest()),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(creditsService.consumeCredits).not.toHaveBeenCalled();
  });

  it("checks the balance before spending money on an AI call", async () => {
    (
      creditsService.assertSufficientCredits as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error("insufficient");
    });

    await expect(
      service.generateCv("user@test.example", "app-001", makeRequest()),
    ).rejects.toThrow("insufficient");
    expect(openRouter.chat).not.toHaveBeenCalled();
  });

  it("persists the grounding report alongside the CV", async () => {
    openRouter.chat.mockResolvedValue(
      JSON.stringify({
        ...VALID_CV_JSON,
        skills: {
          categories: [
            { label: "Tech", items: ["TypeScript", "Kubernetes"] },
          ],
          hard: [],
          soft: [],
        },
      }),
    );

    await service.generateCv("user@test.example", "app-001", makeRequest());

    const saved = (store.save as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as StoredApplication;
    expect(saved.cvContent?.grounding?.removals).toContainEqual({
      context: "Tech",
      kind: "skill",
      label: "Kubernetes",
    });
    expect(saved.cvVersions?.[0].content.grounding).toBeDefined();
  });

  it("drops a language the profile does not list", async () => {
    openRouter.chat.mockResolvedValue(
      JSON.stringify({
        ...VALID_CV_JSON,
        languages: [{ language: "Mandarin", level: "C1 / Courant" }],
      }),
    );

    const cvContent = await service.generateCv(
      "user@test.example",
      "app-001",
      makeRequest(),
    );

    expect(cvContent.languages).toEqual([]);
    expect(cvContent.grounding?.removals).toContainEqual({
      kind: "language",
      label: "Mandarin",
    });
  });

  it("restores the level from the profile rather than the model's guess", async () => {
    openRouter.chat.mockResolvedValue(
      JSON.stringify({
        ...VALID_CV_JSON,
        languages: [{ language: "Anglais", level: "C2 / Bilingue" }],
      }),
    );

    const request = makeRequest();
    request.promptProfile.profileSections.languages = [
      { language: "Anglais", level: "B2 / Intermédiaire" },
    ];

    const cvContent = await service.generateCv(
      "user@test.example",
      "app-001",
      request,
    );

    // Upgrading B2 to C2 is the kind of claim a recruiter tests on the spot.
    expect(cvContent.languages).toEqual([
      { language: "Anglais", level: "B2 / Intermédiaire" },
    ]);
  });

  it("re-injects the candidate links instead of letting the model guess them", async () => {
    openRouter.chat.mockResolvedValue(
      JSON.stringify({
        ...VALID_CV_JSON,
        candidate: {
          ...VALID_CV_JSON.candidate,
          github: "github.com/invented",
          linkedin: "linkedin.com/in/invented",
        },
      }),
    );

    const request = makeRequest();
    request.localFields.linkedin = "linkedin.com/in/jean-dupont";

    const cvContent = await service.generateCv(
      "user@test.example",
      "app-001",
      request,
    );

    expect(cvContent.candidate.linkedin).toBe("linkedin.com/in/jean-dupont");
    expect(cvContent.candidate.github).toBe("");
  });

  it("dates the letter even when the model echoes back an empty field", async () => {
    openRouter.chat.mockResolvedValue(
      JSON.stringify({
        body: { paragraph1: "a", paragraph2: "b", paragraph3: "c" },
        candidate: {},
        company: { city: "", name: "" },
        date: "",
        object: "",
        signature: {},
      }),
    );

    const letter = await service.generateLetter(
      "user@test.example",
      "app-001",
      makeRequest(),
    );

    expect(letter.date).not.toBe("");
    expect(letter.company.name).toBe("Acme Corp");
    expect(letter.company.city).toBe("Paris");
    expect(letter.object).toContain("Senior TypeScript Developer");
  });

  it("drops the grounding notice once the candidate saves by hand", () => {
    const updated = service.updateCvContent("user@test.example", "app-001", {
      cvContent: {
        ...VALID_CV_JSON,
        grounding: {
          generatedAt: "2026-01-01T00:00:00.000Z",
          lockedExperiences: 0,
          removals: [{ kind: "skill", label: "Kubernetes" }],
        },
      },
    });

    expect(updated.grounding).toBeUndefined();
  });
});
