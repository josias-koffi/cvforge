import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  VALID_CV_JSON,
  VALID_LETTER_JSON,
  makeRequest,
  makeStoredApplication,
} from "./cv-generation.fixtures";
import { CvGenerationService } from "./cv-generation.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";
import type { CreditsService } from "../credits/credits.service";
import type { TemplatesStore } from "../templates/templates.types";

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
      assertSufficientCredits: vi.fn(),
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

      // Pseudonymised profile must not include lastName, phone, or email
      expect(userMessage.content).not.toContain("Dupont");
      expect(userMessage.content).not.toContain("+33612345678");
      expect(userMessage.content).not.toContain("user@test.example");
      expect(userMessage.content).toContain("[CANDIDATE]");
      // The offer is fenced off from the profile so the model cannot treat it
      // as a source of facts about the candidate.
      expect(userMessage.content).toContain("=== OFFRE D'EMPLOI");
      expect(userMessage.content).toContain("=== PROFIL CANDIDAT");
      expect(userMessage.content).toContain("INVENTAIRE AUTORISÉ");
      expect(userMessage.content.indexOf("=== OFFRE D'EMPLOI")).toBeLessThan(
        userMessage.content.indexOf("=== PROFIL CANDIDAT"),
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

    it("restores profile facts when the AI omits whole sections", async () => {
      const minimal = { candidate: VALID_CV_JSON.candidate };
      openRouter.chat.mockResolvedValue(JSON.stringify(minimal));

      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );

      // Losing a real job would be as damaging as inventing one: the source
      // profile is rebuilt rather than trusted to the model's output.
      expect(cvContent.experiences).toHaveLength(1);
      expect(cvContent.experiences[0].company).toBe("Tech Corp");
      expect(cvContent.experiences[0].position).toBe("Backend Developer");
      expect(cvContent.education).toHaveLength(1);
      expect(cvContent.education[0].degree).toBe("Master Informatique");
      expect(cvContent.skills.hard).toEqual(["TypeScript", "Node.js"]);
      expect(cvContent.certifications).toEqual([]);
      expect(cvContent.projects).toEqual([]);
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
      // "Go" is nowhere in the profile: it is dropped and reported rather than
      // handed to a recruiter as a skill the candidate does not have.
      expect(cvContent.skills.hard).not.toContain("Go");
      expect(cvContent.grounding?.removals).toContainEqual({
        kind: "skill",
        label: "Go",
      });
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
      // The company the model invented is replaced by the real one, and the
      // unusable achievements fall back to what the profile actually states.
      expect(cvContent.experiences[0]?.company).toBe("Tech Corp");
      expect(cvContent.experiences[0]?.position).toBe("Backend Developer");
      expect(cvContent.experiences[0]?.achievements).toEqual([
        "Delivered key APIs",
      ]);
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

      expect(userMessage.content).toContain("Senior TypeScript Developer");
      expect(userMessage.content).toContain("=== PROFIL CANDIDAT");
      expect(userMessage.content).not.toContain("Dupont");
      expect(userMessage.content).not.toContain("+33612345678");
      expect(userMessage.content).not.toContain("user@test.example");
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

  describe("translateCv", () => {
    const storedCv: CVDocumentContent = {
      ...VALID_CV_JSON,
      candidate: {
        ...VALID_CV_JSON.candidate,
        email: "user@test.example",
        lastName: "Dupont",
        linkedin: "linkedin.com/in/jean-dupont",
        phone: "+33612345678",
        summary: "Développeur TypeScript expérimenté.",
        title: "Développeur TypeScript senior",
      },
      interests: "Course à pied",
    };

    beforeEach(() => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStoredApplication({ cvContent: storedCv, cvVersions: [] }),
      );
      openRouter.chat.mockResolvedValue(
        JSON.stringify({
          cv: {
            candidate: {
              summary: "Experienced TypeScript developer.",
              title: "Senior TypeScript Developer",
            },
            certifications: [],
            education: VALID_CV_JSON.education,
            experiences: VALID_CV_JSON.experiences,
            interests: "Running",
            languages: [],
            projects: [],
            skills: VALID_CV_JSON.skills,
          },
        }),
      );
    });

    it("never sends the candidate identity to the LLM and consumes credits", async () => {
      await service.translateCv("user@test.example", "app-001", "en");

      const [messages] = openRouter.chat.mock.calls[0] as [
        Array<{ role: string; content: string }>,
      ];
      const userMessage = messages.find((m) => m.role === "user")!;
      expect(userMessage.content).not.toContain("Dupont");
      expect(userMessage.content).not.toContain("+33612345678");
      expect(userMessage.content).not.toContain("user@test.example");
      expect(userMessage.content).not.toContain("linkedin.com");
      expect(JSON.parse(userMessage.content)).toMatchObject({
        targetLanguage: "en",
      });
      expect(creditsService.consumeCredits).toHaveBeenCalledWith({
        action: "cv_generation",
        applicationId: "app-001",
        userEmail: "user@test.example",
      });
    });

    it("restores the identity and stores a translation version", async () => {
      const translated = await service.translateCv(
        "user@test.example",
        "app-001",
        "en",
      );

      expect(translated.language).toBe("en");
      expect(translated.candidate.lastName).toBe("Dupont");
      expect(translated.candidate.phone).toBe("+33612345678");
      expect(translated.candidate.title).toBe("Senior TypeScript Developer");
      expect(translated.interests).toBe("Running");
      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;
      expect(saved.cvContent).toEqual(translated);
      expect(saved.cvVersions?.at(-1)?.source).toBe("translation");
    });

    it("keeps original lists when the LLM drops items", async () => {
      openRouter.chat.mockResolvedValue(
        JSON.stringify({ cv: { experiences: [], interests: "Running" } }),
      );

      const translated = await service.translateCv(
        "user@test.example",
        "app-001",
        "en",
      );

      expect(translated.experiences).toEqual(storedCv.experiences);
      expect(translated.candidate.summary).toBe(storedCv.candidate.summary);
    });

    it("rejects an unsupported target language before spending credits", async () => {
      await expect(
        service.translateCv("user@test.example", "app-001", "de"),
      ).rejects.toThrow(BadRequestException);
      expect(creditsService.consumeCredits).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when no CV exists", async () => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStoredApplication(),
      );

      await expect(
        service.translateCv("user@test.example", "app-001", "en"),
      ).rejects.toThrow(NotFoundException);
      expect(creditsService.consumeCredits).not.toHaveBeenCalled();
    });
  });

  describe("translateLetter", () => {
    const storedLetter: LetterDocumentContent = {
      ...VALID_LETTER_JSON,
      body: {
        paragraph1: "Je candidate à votre poste.",
        paragraph2: "Mon expérience correspond.",
        paragraph3: "Au plaisir d'échanger.",
      },
      candidate: {
        ...VALID_LETTER_JSON.candidate,
        email: "user@test.example",
        lastName: "Dupont",
        phone: "+33612345678",
      },
      object: "Candidature au poste de développeur",
      signature: { firstName: "Jean", lastName: "Dupont" },
    };

    it("translates the body, keeps identity and records the version", async () => {
      (store.findByIdForUserEmail as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStoredApplication({ letterContent: storedLetter }),
      );
      openRouter.chat.mockResolvedValue(
        JSON.stringify({
          letter: {
            body: {
              paragraph1: "I am applying for your role.",
              paragraph2: "My experience matches.",
              paragraph3: "I look forward to talking.",
            },
            object: "Application for the developer position",
          },
        }),
      );

      const translated = await service.translateLetter(
        "user@test.example",
        "app-001",
        "en",
      );

      const [messages] = openRouter.chat.mock.calls[0] as [
        Array<{ role: string; content: string }>,
      ];
      expect(messages[1].content).not.toContain("Dupont");
      expect(messages[1].content).not.toContain("user@test.example");
      expect(translated.body.paragraph1).toBe("I am applying for your role.");
      expect(translated.object).toBe("Application for the developer position");
      expect(translated.signature.lastName).toBe("Dupont");
      expect(translated.company).toEqual(storedLetter.company);
      expect(translated.language).toBe("en");
      expect(creditsService.consumeCredits).toHaveBeenCalledWith({
        action: "letter_generation",
        applicationId: "app-001",
        userEmail: "user@test.example",
      });
      const saved = (store.save as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as StoredApplication;
      expect(saved.letterVersions?.at(-1)?.source).toBe("translation");
    });
  });

  describe("document language", () => {
    it("tags generated documents with the offer language", async () => {
      const cvContent = await service.generateCv(
        "user@test.example",
        "app-001",
        makeRequest(),
      );
      expect(cvContent.language).toBe("en");

      openRouter.chat.mockResolvedValue(
        JSON.stringify({ ...VALID_LETTER_JSON, object: undefined }),
      );
      const letterContent = await service.generateLetter(
        "user@test.example",
        "app-001",
        makeRequest(),
      );
      expect(letterContent.language).toBe("en");
      expect(letterContent.object).toBe(
        "Application for the position of Senior TypeScript Developer",
      );
    });

    it("keeps the language on manual saves", () => {
      const updated = service.updateCvContent("user@test.example", "app-001", {
        cvContent: { ...VALID_CV_JSON, language: "en" },
      });
      expect(updated.language).toBe("en");
    });
  });
});
