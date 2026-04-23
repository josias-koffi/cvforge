import { BadRequestException, UnprocessableEntityException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreditsService } from "../credits/credits.service";
import { CvImportService, type CvImportFile } from "./cv-import.service";

const RAW_CV_TEXT = `
Jean Dupont
jean.dupont@example.com
+33 6 12 34 56 78
Adresse: 12 rue de Paris, 75001 Paris
Senior Product Engineer
Experience: Built TypeScript APIs at Acme from 2020 to 2024 with measurable delivery results.
Education: Master Informatique, Sorbonne, 2018.
Skills: TypeScript, Node.js, React, communication, leadership.
`.repeat(2);

const AI_RESPONSE = {
  headline: "Senior Product Engineer",
  identity: {
    city: "Paris",
    firstName: "Jean",
    github: "",
    linkedIn: "https://linkedin.com/in/jean",
    portfolio: "",
  },
  sections: {
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
        company: "Acme",
        period: "2020-2024",
        results: "Built TypeScript APIs with measurable delivery results.",
        role: "Senior Product Engineer",
      },
    ],
    interests: "",
    personalProjects: [],
    softSkills: ["Communication", "Leadership"],
    summary: "Product engineer with TypeScript and API experience.",
    technicalSkills: ["TypeScript", "Node.js", "React"],
  },
};

function makeFile(overrides: Partial<CvImportFile> = {}): CvImportFile {
  return {
    buffer: Buffer.from(RAW_CV_TEXT, "latin1"),
    mimetype: "application/pdf",
    originalname: "cv.pdf",
    size: Buffer.byteLength(RAW_CV_TEXT),
    ...overrides,
  };
}

describe("CvImportService", () => {
  let openRouter: { chat: ReturnType<typeof vi.fn> };
  let creditsService: CreditsService;
  let service: CvImportService;

  beforeEach(() => {
    openRouter = {
      chat: vi.fn().mockResolvedValue(JSON.stringify(AI_RESPONSE)),
    };
    creditsService = {
      consumeCredits: vi.fn(),
    } as unknown as CreditsService;
    service = new CvImportService(openRouter as never, creditsService);
  });

  it("extracts a normalized profile patch from a PDF upload", async () => {
    const result = await service.extractProfileFromCv(
      "user@example.com",
      makeFile(),
    );

    expect(result.extractedProfile.headline).toBe("Senior Product Engineer");
    expect(result.extractedProfile.identity.firstName).toBe("Jean");
    expect(result.extractedProfile.sections.technicalSkills).toContain("TypeScript");
    expect(result.omittedFields).toContain("identity.email");
    expect(result.qualityLimits.length).toBeGreaterThan(0);
    expect(creditsService.consumeCredits).toHaveBeenCalledWith({
      action: "cv_import",
      userEmail: "user@example.com",
    });
  });

  it("sends pseudonymised CV text to OpenRouter", async () => {
    await service.extractProfileFromCv("user@example.com", makeFile());

    const [messages] = openRouter.chat.mock.calls[0] as [
      Array<{ content: string; role: string }>,
    ];
    const userMessage = messages.find((message) => message.role === "user")!;
    const payload = JSON.parse(userMessage.content) as {
      pseudonymisedCvText: string;
    };

    expect(payload.pseudonymisedCvText).not.toContain("jean.dupont@example.com");
    expect(payload.pseudonymisedCvText).not.toContain("+33 6 12 34 56 78");
    expect(payload.pseudonymisedCvText).not.toContain("Dupont");
    expect(payload.pseudonymisedCvText).toContain("[CANDIDATE]");
  });

  it("rejects unsupported files", async () => {
    await expect(
      service.extractProfileFromCv(
        "user@example.com",
        makeFile({ mimetype: "text/plain", originalname: "cv.txt" }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects CVs without enough extractable text", async () => {
    await expect(
      service.extractProfileFromCv(
        "user@example.com",
        makeFile({ buffer: Buffer.from("short"), size: 5 }),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
