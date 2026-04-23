import {
  NotFoundException,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { CVDocumentContent, LetterDocumentContent } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { CvImportService } from "./cv-import.service";
import { CvGenerationController } from "./cv-generation.controller";
import { CvPdfExportService } from "./cv-pdf-export.service";
import { CvGenerationService } from "./cv-generation.service";

const MOCK_CV: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "user@test.example",
    firstName: "Jean",
    github: "",
    lastName: "Dupont",
    linkedin: "",
    phone: "+33612345678",
    summary: "Expert developer",
    title: "Senior Developer",
  },
  certifications: [],
  education: [],
  experiences: [],
  languages: [],
  projects: [],
  skills: { hard: [], soft: [] },
};

const MOCK_LETTER: LetterDocumentContent = {
  body: {
    paragraph1: "Je candidate avec enthousiasme a votre poste.",
    paragraph2: "Mon experience produit correspond a vos attentes.",
    paragraph3: "Je serais ravi d'en discuter avec vous.",
  },
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
  company: {
    city: "Paris",
    name: "Acme",
  },
  date: "2026-04-20",
  object: "Candidature au poste de Senior Developer",
  signature: {
    firstName: "Jean",
    lastName: "Dupont",
  },
};

const VALID_BODY = {
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

function makeController(
  sessionOverride: unknown = { email: "user@test.example", role: "user" },
  serviceOverrides: Partial<Record<keyof CvGenerationService, unknown>> = {},
) {
  const cvService = {
    generateCv: vi.fn().mockResolvedValue(MOCK_CV),
    generateLetter: vi.fn().mockResolvedValue(MOCK_LETTER),
    getCvContent: vi.fn().mockReturnValue(MOCK_CV),
    getLetterContent: vi.fn().mockReturnValue(MOCK_LETTER),
    updateLetterContent: vi.fn().mockReturnValue(MOCK_LETTER),
    updateCvContent: vi.fn().mockReturnValue(MOCK_CV),
    ...serviceOverrides,
  } as unknown as CvGenerationService;

  const pdfService = {
    exportPdf: vi.fn().mockResolvedValue({
      filename: "DUPONT_Jean_CDI_Senior_Developer.pdf",
      pdf: Buffer.from([37, 80, 68, 70]),
    }),
    exportLetterPdf: vi.fn().mockResolvedValue({
      filename: "DUPONT_Jean_CDI_Senior_Developer.pdf",
      pdf: Buffer.from([37, 80, 68, 70]),
    }),
  } as unknown as CvPdfExportService;
  const cvImportService = {
    extractProfileFromCv: vi.fn().mockResolvedValue({
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
          summary: "",
          technicalSkills: [],
        },
      },
      omittedFields: [],
      qualityLimits: [],
      source: {
        filename: "cv.pdf",
        mimeType: "application/pdf",
        textLength: 200,
      },
    }),
  } as unknown as CvImportService;

  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(sessionOverride),
  } as unknown as AuthService;

  return new CvGenerationController(
    cvService,
    pdfService,
    cvImportService,
    authService,
  );
}

describe("CvGenerationController", () => {
  describe("POST :applicationId/generate-cv", () => {
    it("returns cvContent for authenticated user", async () => {
      const controller = makeController();
      const result = await controller.generateCv("app-001", VALID_BODY, {
        headers: { cookie: "cvforge_session=abc" },
      });

      expect(result).toEqual({ cvContent: MOCK_CV });
    });

    it("throws UnauthorizedException when no session", async () => {
      const controller = makeController(null);

      await expect(
        controller.generateCv("app-001", VALID_BODY, { headers: {} }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("delegates to CvGenerationService.generateCv with session email", async () => {
      const cvService = {
        generateCv: vi.fn().mockResolvedValue(MOCK_CV),
        getCvContent: vi.fn(),
      } as unknown as CvGenerationService;
      const pdfService = {
        exportPdf: vi.fn(),
      } as unknown as CvPdfExportService;
      const authService = {
        readSessionFromCookieHeader: vi
          .fn()
          .mockReturnValue({ email: "user@test.example", role: "user" }),
      } as unknown as AuthService;
      const controller = new CvGenerationController(
        cvService,
        pdfService,
        {} as unknown as CvImportService,
        authService,
      );

      await controller.generateCv("app-001", VALID_BODY, {
        headers: { cookie: "s=x" },
      });

      expect(cvService.generateCv).toHaveBeenCalledWith(
        "user@test.example",
        "app-001",
        VALID_BODY,
      );
    });
  });

  describe("POST cv-import/extract", () => {
    it("returns imported profile extraction for authenticated user", async () => {
      const controller = makeController();
      const result = await controller.extractCvProfile(
        {
          buffer: Buffer.from("cv text"),
          mimetype: "application/pdf",
          originalname: "cv.pdf",
          size: 7,
        },
        { headers: { cookie: "cvforge_session=abc" } },
      );

      expect(result).toMatchObject({
        source: {
          filename: "cv.pdf",
        },
      });
    });

    it("throws UnauthorizedException when no session", async () => {
      const controller = makeController(null);

      await expect(
        controller.extractCvProfile(undefined, { headers: {} }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("POST :applicationId/generate-letter", () => {
    it("returns letterContent for authenticated user", async () => {
      const controller = makeController();
      const result = await controller.generateLetter("app-001", VALID_BODY, {
        headers: { cookie: "cvforge_session=abc" },
      });

      expect(result).toEqual({ letterContent: MOCK_LETTER });
    });

    it("throws UnauthorizedException when no session", async () => {
      const controller = makeController(null);

      await expect(
        controller.generateLetter("app-001", VALID_BODY, { headers: {} }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("GET :applicationId/cv", () => {
    it("returns cvContent for authenticated user", () => {
      const controller = makeController();
      const result = controller.getCvContent("app-001", {
        headers: { cookie: "cvforge_session=abc" },
      });

      expect(result).toEqual({ cvContent: MOCK_CV });
    });

    it("throws NotFoundException when no CV generated yet", () => {
      const controller = makeController(
        { email: "user@test.example", role: "user" },
        { getCvContent: vi.fn().mockReturnValue(null) },
      );

      expect(() =>
        controller.getCvContent("app-001", { headers: { cookie: "s=x" } }),
      ).toThrow(NotFoundException);
    });

    it("throws UnauthorizedException when no session", () => {
      const controller = makeController(null);

      expect(() => controller.getCvContent("app-001", { headers: {} })).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("GET :applicationId/letter", () => {
    it("returns letterContent for authenticated user", () => {
      const controller = makeController();
      const result = controller.getLetterContent("app-001", {
        headers: { cookie: "cvforge_session=abc" },
      });

      expect(result).toEqual({ letterContent: MOCK_LETTER });
    });

    it("throws NotFoundException when no letter generated yet", () => {
      const controller = makeController(
        { email: "user@test.example", role: "user" },
        { getLetterContent: vi.fn().mockReturnValue(null) },
      );

      expect(() =>
        controller.getLetterContent("app-001", { headers: { cookie: "s=x" } }),
      ).toThrow(NotFoundException);
    });
  });

  describe("PUT :applicationId/cv", () => {
    it("returns cvContent for authenticated user", () => {
      const controller = makeController();
      const result = controller.updateCvContent(
        "app-001",
        { cvContent: MOCK_CV },
        { headers: { cookie: "cvforge_session=abc" } },
      );

      expect(result).toEqual({ cvContent: MOCK_CV });
    });

    it("throws UnauthorizedException when no session", () => {
      const controller = makeController(null);

      expect(() =>
        controller.updateCvContent(
          "app-001",
          { cvContent: MOCK_CV },
          { headers: {} },
        ),
      ).toThrow(UnauthorizedException);
    });

    it("delegates to CvGenerationService.updateCvContent with session email", () => {
      const cvService = {
        generateCv: vi.fn(),
        getCvContent: vi.fn(),
        updateCvContent: vi.fn().mockReturnValue(MOCK_CV),
      } as unknown as CvGenerationService;
      const pdfService = {
        exportPdf: vi.fn(),
      } as unknown as CvPdfExportService;
      const authService = {
        readSessionFromCookieHeader: vi
          .fn()
          .mockReturnValue({ email: "user@test.example", role: "user" }),
      } as unknown as AuthService;
      const controller = new CvGenerationController(
        cvService,
        pdfService,
        {} as unknown as CvImportService,
        authService,
      );

      controller.updateCvContent(
        "app-001",
        { cvContent: MOCK_CV },
        { headers: { cookie: "s=x" } },
      );

      expect(cvService.updateCvContent).toHaveBeenCalledWith(
        "user@test.example",
        "app-001",
        { cvContent: MOCK_CV },
      );
    });
  });

  describe("PUT :applicationId/letter", () => {
    it("returns letterContent for authenticated user", () => {
      const controller = makeController();
      const result = controller.updateLetterContent(
        "app-001",
        { letterContent: MOCK_LETTER },
        { headers: { cookie: "cvforge_session=abc" } },
      );

      expect(result).toEqual({ letterContent: MOCK_LETTER });
    });

    it("throws UnauthorizedException when no session", () => {
      const controller = makeController(null);

      expect(() =>
        controller.updateLetterContent(
          "app-001",
          { letterContent: MOCK_LETTER },
          { headers: {} },
        ),
      ).toThrow(UnauthorizedException);
    });
  });

  describe("GET :applicationId/cv/pdf", () => {
    it("returns a streamed PDF file for authenticated user", async () => {
      const controller = makeController();
      const result = await controller.exportPdf("app-001", {
        headers: { cookie: "cvforge_session=abc" },
      });

      expect(result).toBeInstanceOf(StreamableFile);
      expect(result.getHeaders()).toMatchObject({
        disposition:
          'attachment; filename="DUPONT_Jean_CDI_Senior_Developer.pdf"',
        type: "application/pdf",
      });
    });

    it("throws UnauthorizedException when no session", async () => {
      const controller = makeController(null);

      await expect(
        controller.exportPdf("app-001", { headers: {} }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("delegates to CvPdfExportService.exportPdf with session email", async () => {
      const cvService = {
        generateCv: vi.fn(),
        getCvContent: vi.fn(),
        updateCvContent: vi.fn(),
      } as unknown as CvGenerationService;
      const pdfService = {
        exportPdf: vi.fn().mockResolvedValue({
          filename: "DUPONT_Jean_CDI_Senior_Developer.pdf",
          pdf: Buffer.from([37, 80, 68, 70]),
        }),
      } as unknown as CvPdfExportService;
      const authService = {
        readSessionFromCookieHeader: vi
          .fn()
          .mockReturnValue({ email: "user@test.example", role: "user" }),
      } as unknown as AuthService;
      const controller = new CvGenerationController(
        cvService,
        pdfService,
        {} as unknown as CvImportService,
        authService,
      );

      await controller.exportPdf("app-001", { headers: { cookie: "s=x" } });

      expect(pdfService.exportPdf).toHaveBeenCalledWith(
        "user@test.example",
        "app-001",
      );
    });
  });

  describe("GET :applicationId/letter/pdf", () => {
    it("returns a streamed PDF file for authenticated user", async () => {
      const controller = makeController();
      const result = await controller.exportLetterPdf("app-001", {
        headers: { cookie: "cvforge_session=abc" },
      });

      expect(result).toBeInstanceOf(StreamableFile);
      expect(result.getHeaders()).toMatchObject({
        disposition:
          'attachment; filename="DUPONT_Jean_CDI_Senior_Developer.pdf"',
        type: "application/pdf",
      });
    });

    it("delegates to CvPdfExportService.exportLetterPdf with session email", async () => {
      const cvService = {
        generateCv: vi.fn(),
        getCvContent: vi.fn(),
        updateCvContent: vi.fn(),
      } as unknown as CvGenerationService;
      const pdfService = {
        exportLetterPdf: vi.fn().mockResolvedValue({
          filename: "DUPONT_Jean_CDI_Senior_Developer.pdf",
          pdf: Buffer.from([37, 80, 68, 70]),
        }),
      } as unknown as CvPdfExportService;
      const authService = {
        readSessionFromCookieHeader: vi
          .fn()
          .mockReturnValue({ email: "user@test.example", role: "user" }),
      } as unknown as AuthService;
      const controller = new CvGenerationController(
        cvService,
        pdfService,
        {} as unknown as CvImportService,
        authService,
      );

      await controller.exportLetterPdf("app-001", {
        headers: { cookie: "s=x" },
      });

      expect(pdfService.exportLetterPdf).toHaveBeenCalledWith(
        "user@test.example",
        "app-001",
      );
    });
  });
});
