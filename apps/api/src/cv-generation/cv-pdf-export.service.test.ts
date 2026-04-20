import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredApplication } from "../applications/applications.types";
import { CvPdfExportService } from "./cv-pdf-export.service";

function makeStoredApplication(
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    cvContent: {
      candidate: {
        city: "Paris",
        email: "user@test.example",
        firstName: "Jean",
        github: "github.com/jean",
        lastName: "Dupont",
        linkedin: "linkedin.com/in/jean",
        phone: "+33612345678",
        summary: "Expert developer",
        title: "Senior Developer",
      },
      certifications: [],
      education: [],
      experiences: [],
      languages: [],
      projects: [],
      skills: { hard: ["TypeScript"], soft: ["Communication"] },
    },
    cvGeneratedAt: "2026-01-02T00:00:00.000Z",
    id: "app-001",
    offerTextPreview: "A great job at Acme Corp.",
    offerUrl: "https://acme.example/jobs/1",
    rawOfferText: "Offer text",
    sourceLabel: "https://acme.example/jobs/1",
    sourceType: "url",
    status: "draft",
    statusHistory: [{ changedAt: "2026-01-01T00:00:00.000Z", status: "draft" }],
    updatedAt: "2026-01-02T00:00:00.000Z",
    userEmail: "user@test.example",
    extracted: {
      companyName: "Acme Corp",
      contractType: "CDI",
      language: "en",
      location: "Paris",
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "Senior TypeScript developer",
      title: "Senior Developer",
    },
    ...overrides,
  };
}

describe("CvPdfExportService", () => {
  let store: {
    findByIdForUserEmail: ReturnType<typeof vi.fn>;
  };
  let service: CvPdfExportService;

  beforeEach(() => {
    store = {
      findByIdForUserEmail: vi.fn().mockReturnValue(makeStoredApplication()),
    };
    service = new CvPdfExportService(store as never);
    globalThis.fetch = vi.fn();
    process.env.PUPPETEER_URL = "http://puppeteer:3002";
  });

  it("posts faithful CV HTML to the dedicated Puppeteer service and returns the PDF plus filename", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          "content-type": "application/pdf",
        },
        status: 200,
      }),
    );

    const result = await service.exportPdf("user@test.example", "app-001");

    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(result.filename).toBe("DUPONT_Jean_CDI_Senior_Developer.pdf");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "http://puppeteer:3002/pdf",
      expect.objectContaining({
        body: expect.any(String),
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    const payload = JSON.parse(
      (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body as string,
    ) as {
      html: string;
      options: { format: string; printBackground: boolean };
    };

    expect(payload.html).toContain("<title>CVforge CV export</title>");
    expect(payload.html).toContain("Jean Dupont");
    expect(payload.html).not.toContain('meta name="author"');
    expect(payload.options.format).toBe("A4");
    expect(payload.options.printBackground).toBe(true);
  });

  it("renders every CV section into the HTML payload", async () => {
    store.findByIdForUserEmail.mockReturnValue(
      makeStoredApplication({
        cvContent: {
          candidate: {
            city: "Lyon",
            email: "user@test.example",
            firstName: "Jean",
            github: "github.com/jean",
            lastName: "Dupont",
            linkedin: "linkedin.com/in/jean",
            phone: "+33612345678",
            summary: "Experienced profile",
            title: "Staff Developer",
          },
          certifications: [
            { issuer: "AWS", title: "Architect", year: "2025" },
          ],
          education: [
            {
              degree: "Master Informatique",
              institution: "Sorbonne",
              mention: "Bien",
              year: "2018",
            },
          ],
          experiences: [
            {
              achievements: ["Delivered APIs", "Led team"],
              company: "Tech Corp",
              description: "Built backend systems",
              endDate: "2024",
              position: "Backend Developer",
              startDate: "2020",
            },
          ],
          languages: [{ language: "English", level: "C1" }],
          projects: [
            {
              description: "Built tooling",
              title: "Platform",
              url: "https://example.com",
            },
          ],
          skills: { hard: ["TypeScript"], soft: ["Communication"] },
        },
      }),
    );

    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          "content-type": "application/pdf",
        },
        status: 200,
      }),
    );

    await service.exportPdf("user@test.example", "app-001");

    const payload = JSON.parse(
      (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { html: string };

    expect(payload.html).toContain("Profil");
    expect(payload.html).toContain("Expériences");
    expect(payload.html).toContain("Formation");
    expect(payload.html).toContain("Compétences");
    expect(payload.html).toContain("Langues");
    expect(payload.html).toContain("Certifications");
    expect(payload.html).toContain("Projets");
    expect(payload.html).toContain("Delivered APIs");
    expect(payload.html).toContain("https://example.com");
  });

  it("falls back to safe filename segments when application data is incomplete", async () => {
    store.findByIdForUserEmail.mockReturnValue(
      makeStoredApplication({
        cvContent: {
          ...makeStoredApplication().cvContent!,
          candidate: {
            ...makeStoredApplication().cvContent!.candidate,
            firstName: "",
            lastName: "",
            title: "",
          },
        },
        extracted: {
          ...makeStoredApplication().extracted,
          contractType: null,
          title: "",
        },
      }),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          "content-type": "application/pdf",
        },
        status: 200,
      }),
    );

    const result = await service.exportPdf("user@test.example", "app-001");

    expect(result.filename).toBe(
      "CANDIDAT_Candidat_Contrat_Poste.pdf",
    );
  });

  it("throws when the application is missing", async () => {
    store.findByIdForUserEmail.mockReturnValue(null);

    await expect(
      service.exportPdf("user@test.example", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws when no CV has been generated yet", async () => {
    store.findByIdForUserEmail.mockReturnValue(
      makeStoredApplication({ cvContent: null }),
    );

    await expect(
      service.exportPdf("user@test.example", "app-001"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws when the Puppeteer service is not configured", async () => {
    delete process.env.PUPPETEER_URL;

    await expect(
      service.exportPdf("user@test.example", "app-001"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws a gateway error when Browserless returns a failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("browserless error", {
        status: 502,
      }),
    );

    await expect(
      service.exportPdf("user@test.example", "app-001"),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

});
