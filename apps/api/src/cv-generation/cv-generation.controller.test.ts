import {
  NotFoundException,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { CVDocumentContent } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
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
    getCvContent: vi.fn().mockReturnValue(MOCK_CV),
    updateCvContent: vi.fn().mockReturnValue(MOCK_CV),
    ...serviceOverrides,
  } as unknown as CvGenerationService;

  const pdfService = {
    exportPdf: vi.fn().mockResolvedValue({
      filename: "DUPONT_Jean_CDI_Senior_Developer.pdf",
      pdf: Buffer.from([37, 80, 68, 70]),
    }),
  } as unknown as CvPdfExportService;

  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(sessionOverride),
  } as unknown as AuthService;

  return new CvGenerationController(cvService, pdfService, authService);
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
        authService,
      );

      await controller.exportPdf("app-001", { headers: { cookie: "s=x" } });

      expect(pdfService.exportPdf).toHaveBeenCalledWith(
        "user@test.example",
        "app-001",
      );
    });
  });
});
