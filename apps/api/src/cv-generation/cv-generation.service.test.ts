import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CVDocumentContent,
  CvGenerationRequest,
  LetterDocumentContent,
} from "@cvforge/types";
import { CvGenerationService } from "./cv-generation.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";
import type { CreditsService } from "../credits/credits.service";
import type { TemplatesStore } from "../templates/templates.types";

function makeStoredApplication(
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    id: "app-001",
    letterContent: null,
    letterGeneratedAt: null,
    offerTextPreview: "A great job at Acme Corp.",
    offerUrl: "https://acme.example/jobs/1",
    rawOfferText:
      "We are hiring a senior TypeScript developer with 5 years of experience. Skills: TypeScript, Node.js, React. Responsibilities: Build APIs and UIs.",
    sourceLabel: "https://acme.example/jobs/1",
    sourceType: "url",
    status: "draft",
    statusHistory: [{ changedAt: "2026-01-01T00:00:00.000Z", status: "draft" }],
    updatedAt: "2026-01-01T00:00:00.000Z",
    userEmail: "user@test.example",
    extracted: {
      companyName: "Acme Corp",
      contractType: "CDI",
      language: "en",
      location: "Paris",
      requirements: ["TypeScript", "Node.js"],
      responsibilities: ["Build APIs"],
      salaryRange: null,
      summary: "Senior TypeScript developer",
      title: "Senior TypeScript Developer",
    },
    ...overrides,
  };
}

function makeRequest(
  overrides: Partial<CvGenerationRequest> = {},
): CvGenerationRequest {
  return {
    localFields: {
      email: "user@test.example",
      lastName: "Dupont",
      phone: "+33612345678",
    },
    promptProfile: {
      headline: "Senior Developer",
      identity: {
        candidateToken: "[CANDIDATE]",
        city: "Paris",
        firstName: "Jean",
      },
      profileSections: {
        certifications: [],
        education: [
          {
            degree: "Master Informatique",
            honors: "",
            institution: "Sorbonne",
            year: "2018",
          },
        ],
        experiences: [
          {
            company: "Tech Corp",
            period: "2020-2023",
            results: "Delivered key APIs",
            role: "Backend Developer",
          },
        ],
        interests: "",
        personalProjects: [],
        softSkills: ["Communication"],
        summary: "Experienced backend developer",
        technicalSkills: ["TypeScript", "Node.js"],
      },
    },
    ...overrides,
  };
}

const VALID_CV_JSON: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "",
    firstName: "Jean",
    github: "",
    lastName: "[CANDIDATE]",
    linkedin: "",
    phone: "",
    summary: "Expert TypeScript developer with 5+ years.",
    title: "Senior TypeScript Developer",
  },
  certifications: [],
  education: [
    {
      description: "Specialized in distributed systems.",
      degree: "Master Informatique",
      institution: "Sorbonne",
      mention: "",
      year: "2018",
    },
  ],
  experiences: [
    {
      achievements: ["Delivered key APIs"],
      company: "Tech Corp",
      description: "Built backend systems",
      endDate: "2023",
      position: "Backend Developer",
      startDate: "2020",
    },
  ],
  languages: [],
  projects: [],
  interests: "Running, photography",
  skills: { hard: ["TypeScript", "Node.js"], soft: ["Communication"] },
};

const VALID_LETTER_JSON: LetterDocumentContent = {
  body: {
    paragraph1: "I am applying for your senior TypeScript role.",
    paragraph2: "My backend and product experience align with your needs.",
    paragraph3: "I would welcome the opportunity to discuss this role.",
  },
  candidate: {
    city: "Paris",
    email: "",
    firstName: "Jean",
    github: "",
    lastName: "[CANDIDATE]",
    linkedin: "",
    phone: "",
    title: "Senior TypeScript Developer",
  },
  company: {
    city: "Paris",
    name: "Acme Corp",
  },
  date: "2026-04-20",
  object: "Application for Senior TypeScript Developer",
  signature: {
    firstName: "Jean",
    lastName: "[CANDIDATE]",
  },
};

describe("CvGenerationService", () => {
  let store: ApplicationsStore;
  let openRouter: { chat: ReturnType<typeof vi.fn> };
  let creditsService: CreditsService;
  let templatesStore: Pick<TemplatesStore, "list">;
  let service: CvGenerationService;

  beforeEach(() => {
    const app = makeStoredApplication();

    store = {
      createDraft: vi.fn(),
      findById: vi.fn().mockReturnValue(app),
      findByIdForUserEmail: vi.fn().mockReturnValue(app),
      listAll: vi.fn().mockReturnValue([app]),
      listByUserEmail: vi.fn().mockReturnValue([app]),
      save: vi.fn().mockImplementation((a: StoredApplication) => a),
    };

    openRouter = {
      chat: vi.fn().mockResolvedValue(JSON.stringify(VALID_CV_JSON)),
    };
    creditsService = {
      consumeCredits: vi.fn(),
    } as unknown as CreditsService;
    templatesStore = {
      list: vi.fn().mockReturnValue([
        {
          active: true,
          categories: ["ATS"],
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "template-cv-ats",
          isDefault: true,
          kind: "cv",
          layout: { content: [], root: { props: {} } },
          locale: "fr",
          name: "CV ATS",
          updatedAt: "2026-04-20T00:00:00.000Z",
        },
        {
          active: true,
          categories: ["ATS"],
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "template-letter-ats",
          isDefault: true,
          kind: "letter",
          layout: { content: [], root: { props: {} } },
          locale: "fr",
          name: "LM ATS",
          updatedAt: "2026-04-20T00:00:00.000Z",
        },
      ]),
    };
    service = new CvGenerationService(
      store,
      openRouter as never,
      creditsService,
      templatesStore,
    );
  });

  describe("generateCv", () => {
    it("calls openRouter.chat with pseudonymised profile (no lastName/phone/email)", async () => {
      await service.generateCv("user@test.example", "app-001", makeRequest());

      const [messages] = (openRouter.chat as ReturnType<typeof vi.fn>).mock
        .calls[0] as [Array<{ role: string; content: string }>];
      const userMessage = messages.find((m) => m.role === "user")!;
      const payload = JSON.parse(userMessage.content) as {
        pseudonymisedProfile: { identity: Record<string, unknown> };
      };

      // Pseudonymised profile must not include lastName, phone, or email
      expect(payload.pseudonymisedProfile.identity).not.toHaveProperty(
        "lastName",
      );
      expect(payload.pseudonymisedProfile.identity).not.toHaveProperty("phone");
      expect(payload.pseudonymisedProfile.identity).not.toHaveProperty("email");
      expect(payload.pseudonymisedProfile.identity).toHaveProperty(
        "candidateToken",
        "[CANDIDATE]",
      );
      expect(creditsService.consumeCredits).toHaveBeenCalledWith({
        action: "cv_generation",
        applicationId: "app-001",
        userEmail: "user@test.example",
      });
    });

    it("injects localFields into the returned cvContent", async () => {
      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      expect(cvContent.candidate.lastName).toBe("Dupont");
      expect(cvContent.candidate.phone).toBe("+33612345678");
      expect(cvContent.candidate.email).toBe("user@test.example");
    });

    it("persists cvContent in the store", async () => {
      await service.generateCv("user@test.example", "app-001", makeRequest());

      expect(store.save).toHaveBeenCalledOnce();
      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;

      expect(saved.cvContent).toBeDefined();
      expect(saved.cvGeneratedAt).toBeTruthy();
      expect(saved.cvTemplateId).toBe("template-cv-ats");
      expect(saved.cvVersions).toHaveLength(1);
      expect(saved.cvVersions?.[0]).toMatchObject({
        source: "generation",
        templateId: "template-cv-ats",
        versionNumber: 1,
      });
    });

    it("appends a manual CV version when content is saved", () => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStoredApplication({
          cvContent: VALID_CV_JSON,
          cvGeneratedAt: "2026-01-02T00:00:00.000Z",
          cvTemplateId: "template-cv-ats",
          cvVersions: [
            {
              content: VALID_CV_JSON,
              createdAt: "2026-01-02T00:00:00.000Z",
              id: "app-001-cv-v1",
              source: "generation",
              templateId: "template-cv-ats",
              versionNumber: 1,
            },
          ],
        }),
      );

      service.updateCvContent("user@test.example", "app-001", {
        cvContent: VALID_CV_JSON,
      });

      const saved = (store.save as ReturnType<typeof vi.fn>).mock.calls.at(
        -1,
      )?.[0] as StoredApplication;

      expect(saved.cvVersions).toHaveLength(2);
      expect(saved.cvVersions?.[1]).toMatchObject({
        source: "manual_save",
        templateId: "template-cv-ats",
        versionNumber: 2,
      });
    });

    it("throws NotFoundException when application not found", async () => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        null,
      );

      await expect(
        service.generateCv("user@test.example", "missing", makeRequest()),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws UnprocessableEntityException when AI returns non-JSON (no braces)", async () => {
      openRouter.chat.mockResolvedValue("Sorry, I cannot generate a CV.");

      await expect(
        service.generateCv("user@test.example", "app-001", makeRequest()),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("throws UnprocessableEntityException when AI returns malformed JSON (braces but invalid)", async () => {
      openRouter.chat.mockResolvedValue("{ invalid json content }");

      await expect(
        service.generateCv("user@test.example", "app-001", makeRequest()),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("consumes credits before generating a letter", async () => {
      openRouter.chat.mockResolvedValue(JSON.stringify(VALID_LETTER_JSON));

      await service.generateLetter(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      expect(creditsService.consumeCredits).toHaveBeenCalledWith({
        action: "letter_generation",
        applicationId: "app-001",
        userEmail: "user@test.example",
      });
    });

    it("persists the default letter template usage", async () => {
      openRouter.chat.mockResolvedValue(JSON.stringify(VALID_LETTER_JSON));

      await service.generateLetter(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      const saved = (store.save as ReturnType<typeof vi.fn>).mock.calls.at(
        -1,
      )?.[0] as StoredApplication;

      expect(saved.letterTemplateId).toBe("template-letter-ats");
      expect(saved.letterVersions?.[0]).toMatchObject({
        source: "generation",
        templateId: "template-letter-ats",
        versionNumber: 1,
      });
    });

    it("parses fenced json block from AI response", async () => {
      openRouter.chat.mockResolvedValue(
        "```json\n" + JSON.stringify(VALID_CV_JSON) + "\n```",
      );

      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );
      expect(cvContent.candidate.firstName).toBe("Jean");
    });

    it("preserves empty arrays when AI omits optional sections", async () => {
      const minimal = { candidate: VALID_CV_JSON.candidate };
      openRouter.chat.mockResolvedValue(JSON.stringify(minimal));

      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );
      expect(cvContent.experiences).toEqual([]);
      expect(cvContent.education).toEqual([]);
      expect(cvContent.skills).toEqual({ hard: [], soft: [] });
    });

    it("system prompt mentions [CANDIDATE] token and forbids phone/email", async () => {
      await service.generateCv("user@test.example", "app-001", makeRequest());
      const [callMessages] = (openRouter.chat as ReturnType<typeof vi.fn>).mock
        .calls[0] as [Array<{ role: string; content: string }>];
      const systemMsg = callMessages.find((m) => m.role === "system")!;

      expect(systemMsg.content).toContain("[CANDIDATE]");
      expect(systemMsg.content).toContain("phone");
      expect(systemMsg.content.toLowerCase()).toContain("jamais");
    });

    it("throws BadRequestException when all localFields are empty strings", async () => {
      const { BadRequestException } = await import("@nestjs/common");
      const request = makeRequest({
        localFields: { email: "", lastName: "", phone: "" },
      });

      await expect(
        service.generateCv("user@test.example", "app-001", request),
      ).rejects.toThrow(BadRequestException);
    });

    it("normalises partial AI JSON with missing candidate fields gracefully", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({
          candidate: {},
          experiences: [
            {
              company: "Acme",
              position: "Dev",
              startDate: "2020",
              endDate: "2023",
              description: "Work",
              achievements: [],
            },
          ],
          skills: { hard: ["Go"], soft: [] },
        }),
      );

      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      expect(cvContent.candidate.firstName).toBe("");
      expect(cvContent.candidate.lastName).toBe("Dupont");
      expect(cvContent.skills.hard).toEqual(["Go"]);
    });

    it("normalises AI JSON with no candidate field at all", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({
          experiences: [],
          skills: { hard: ["TypeScript"], soft: [] },
        }),
      );

      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );
      expect(cvContent.candidate.lastName).toBe("Dupont");
      expect(cvContent.candidate.firstName).toBe("");
    });

    it("handles non-array achievements in experience items", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({
          candidate: VALID_CV_JSON.candidate,
          experiences: [
            {
              company: "Acme",
              position: "Dev",
              startDate: "2020",
              endDate: "2023",
              description: "Work",
              achievements: "not an array",
            },
          ],
        }),
      );

      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );
      expect(cvContent.experiences[0]?.achievements).toEqual([]);
    });
  });

  describe("updateCvContent", () => {
    it("persists sanitized cvContent updates", () => {
      const updated = service.updateCvContent("user@test.example", "app-001", {
        cvContent: {
          candidate: {
            city: " Lyon ",
            email: " user@test.example ",
            firstName: " Jean ",
            github: " github.com/jean ",
            lastName: " Dupont ",
            linkedin: " linkedin.com/in/jean ",
            phone: " +33612345678 ",
            summary: " Updated summary ",
            title: " Senior Developer ",
          },
          certifications: [
            { issuer: " AWS ", title: " Architect ", year: " 2025 " },
          ],
          education: [
            {
              description: " Programme IA ",
              degree: " Master ",
              institution: " Sorbonne ",
              mention: " Bien ",
              year: " 2018 ",
            },
          ],
          experiences: [
            {
              achievements: [" Delivered APIs ", ""],
              company: " Tech Corp ",
              description: " Built systems ",
              endDate: " 2024 ",
              position: " Engineer ",
              startDate: " 2020 ",
            },
          ],
          interests: " Course a pied ",
          languages: [{ language: " English ", level: " C1 " }],
          projects: [
            {
              description: " Built tooling ",
              title: " Platform ",
              url: " https://example.com ",
            },
          ],
          skills: { hard: [" TypeScript ", ""], soft: [" Communication "] },
        },
      });

      expect(updated.candidate.firstName).toBe("Jean");
      expect(updated.candidate.email).toBe("user@test.example");
      expect(updated.education[0]?.description).toBe("Programme IA");
      expect(updated.interests).toBe("Course a pied");
      expect(updated.skills.hard).toEqual(["TypeScript"]);
      expect(store.save).toHaveBeenCalledOnce();
      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;
      expect(saved.cvGeneratedAt).toBeTruthy();
      expect(saved.cvContent?.candidate.title).toBe("Senior Developer");
    });

    it("updates an existing cvContent without clearing generatedAt", () => {
      const app = makeStoredApplication({
        cvContent: VALID_CV_JSON,
        cvGeneratedAt: "2026-04-20T12:00:00.000Z",
      });
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        app,
      );

      const updated = service.updateCvContent("user@test.example", "app-001", {
        cvContent: {
          ...VALID_CV_JSON,
          candidate: { ...VALID_CV_JSON.candidate, summary: "Updated" },
        },
      });

      expect(updated.candidate.summary).toBe("Updated");
      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;
      expect(saved.cvGeneratedAt).toBe("2026-04-20T12:00:00.000Z");
    });

    it("throws NotFoundException when the application is missing", () => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        null,
      );

      expect(() =>
        service.updateCvContent("user@test.example", "missing", {
          cvContent: VALID_CV_JSON,
        }),
      ).toThrow(NotFoundException);
    });
  });

  describe("generateLetter", () => {
    it("calls openRouter.chat with the same pseudonymised profile shape", async () => {
      openRouter.chat.mockResolvedValue(JSON.stringify(VALID_LETTER_JSON));

      await service.generateLetter(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      const [messages] = openRouter.chat.mock.calls[0] as [
        Array<{ role: string; content: string }>,
      ];
      const userMessage = messages.find((m) => m.role === "user")!;
      const payload = JSON.parse(userMessage.content) as {
        offerContext: { title: string };
        pseudonymisedProfile: { identity: Record<string, unknown> };
      };

      expect(payload.offerContext.title).toBe("Senior TypeScript Developer");
      expect(payload.pseudonymisedProfile.identity).not.toHaveProperty(
        "lastName",
      );
      expect(payload.pseudonymisedProfile.identity).not.toHaveProperty("phone");
      expect(payload.pseudonymisedProfile.identity).not.toHaveProperty("email");
    });

    it("injects local fields into the returned letter content", async () => {
      openRouter.chat.mockResolvedValue(JSON.stringify(VALID_LETTER_JSON));

      const letterContent = await service.generateLetter(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      expect(letterContent.candidate.lastName).toBe("Dupont");
      expect(letterContent.candidate.phone).toBe("+33612345678");
      expect(letterContent.candidate.email).toBe("user@test.example");
      expect(letterContent.signature.lastName).toBe("Dupont");
    });

    it("persists letter content in the store", async () => {
      openRouter.chat.mockResolvedValue(JSON.stringify(VALID_LETTER_JSON));

      await service.generateLetter(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;
      expect(saved.letterContent?.company.name).toBe("Acme Corp");
      expect(saved.letterGeneratedAt).toBeTruthy();
    });
  });

  describe("updateLetterContent", () => {
    it("persists sanitized letter updates", () => {
      const updated = service.updateLetterContent(
        "user@test.example",
        "app-001",
        {
          letterContent: {
            body: {
              paragraph1: " Bonjour ",
              paragraph2: " Experience solide ",
              paragraph3: " A bientot ",
            },
            candidate: {
              city: " Paris ",
              email: " user@test.example ",
              firstName: " Jean ",
              github: " github.com/jean ",
              lastName: " Dupont ",
              linkedin: " linkedin.com/in/jean ",
              phone: " +33612345678 ",
              title: " Senior Developer ",
            },
            company: {
              city: " Lyon ",
              name: " Acme ",
            },
            date: " 2026-04-20 ",
            object: " Candidature ",
            signature: {
              firstName: " Jean ",
              lastName: " Dupont ",
            },
          },
        },
      );

      expect(updated.body.paragraph1).toBe("Bonjour");
      expect(updated.company.name).toBe("Acme");
      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;
      expect(saved.letterGeneratedAt).toBeTruthy();
    });
  });

  describe("getCvContent", () => {
    it("returns null when no CV has been generated", () => {
      const result = service.getCvContent("user@test.example", "app-001");
      expect(result).toBeNull();
    });

    it("returns the stored cvContent", () => {
      const app = makeStoredApplication({
        cvContent: VALID_CV_JSON,
        cvGeneratedAt: "2026-04-20T12:00:00.000Z",
      });
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        app,
      );

      const result = service.getCvContent("user@test.example", "app-001");
      expect(result).toEqual(VALID_CV_JSON);
    });

    it("throws NotFoundException when application not found", () => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        null,
      );

      expect(() =>
        service.getCvContent("user@test.example", "missing"),
      ).toThrow(NotFoundException);
    });
  });

  describe("getLetterContent", () => {
    it("returns the stored letterContent", () => {
      const app = makeStoredApplication({
        letterContent: VALID_LETTER_JSON,
        letterGeneratedAt: "2026-04-20T12:00:00.000Z",
      });
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        app,
      );

      const result = service.getLetterContent("user@test.example", "app-001");
      expect(result).toEqual(VALID_LETTER_JSON);
    });
  });
});
