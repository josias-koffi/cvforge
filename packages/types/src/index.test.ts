import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_OFFER_RECEIVED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_SENT,
  APPLICATION_SOURCE_URL,
  DIVIDER_STYLE_SOLID,
  SECTION_TITLE_STYLE_ACCENT,
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  applicationStatusTransitions,
  applicationStatuses,
  type CVDocumentContent,
  type CvContentUpdateRequest,
  type LetterContentUpdateRequest,
  type ApplicationsKpiSummary,
  type DraftApplication,
  HEALTH_STATUS_OK,
  type LetterDocumentContent,
  type Locale,
  type TemplateRecord,
  type TemplateUpsertInput,
  type ServiceHealth,
  supportedLocales,
} from "./index";

describe("types package", () => {
  it("should allow the supported locales", () => {
    const locale: Locale = "fr";

    expect(locale).toBe("fr");
    expect(supportedLocales).toEqual(["fr", "en"]);
  });

  it("should shape the service health contract", () => {
    const health: ServiceHealth = {
      status: HEALTH_STATUS_OK,
      service: "api",
    };

    expect(health).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("should shape a draft application contract", () => {
    const application: DraftApplication = {
      createdAt: "2026-04-20T12:00:00.000Z",
      cvGeneratedAt: null,
      id: "app_123",
      letterGeneratedAt: null,
      offerUrl: "https://example.com/jobs/123",
      offerTextPreview: "Lead the platform team and improve reliability.",
      sourceLabel: "https://example.com/jobs/123",
      sourceType: APPLICATION_SOURCE_URL,
      status: APPLICATION_STATUS_DRAFT,
      statusHistory: [
        {
          changedAt: "2026-04-20T12:00:00.000Z",
          status: APPLICATION_STATUS_DRAFT,
        },
      ],
      updatedAt: "2026-04-20T12:00:00.000Z",
      userEmail: "user@example.com",
      extracted: {
        companyName: "Example",
        contractType: "CDI",
        language: "fr",
        location: "Paris",
        requirements: ["Node.js"],
        responsibilities: ["Build APIs"],
        salaryRange: null,
        summary: "Platform engineering role.",
        title: "Platform Engineer",
      },
    };

    expect(application.status).toBe("draft");
    expect(application.extracted.language).toBe("fr");
    expect(application.sourceType).toBe("url");
    expect(application.statusHistory).toHaveLength(1);
  });

  it("should expose the candidature pipeline statuses and transitions", () => {
    expect(applicationStatuses).toEqual([
      APPLICATION_STATUS_DRAFT,
      APPLICATION_STATUS_SENT,
      APPLICATION_STATUS_INTERVIEW_SCHEDULED,
      APPLICATION_STATUS_REJECTED,
      APPLICATION_STATUS_OFFER_RECEIVED,
    ]);
    expect(applicationStatusTransitions[APPLICATION_STATUS_DRAFT]).toEqual([
      APPLICATION_STATUS_SENT,
    ]);
    expect(
      applicationStatusTransitions[APPLICATION_STATUS_INTERVIEW_SCHEDULED],
    ).toEqual([APPLICATION_STATUS_REJECTED, APPLICATION_STATUS_OFFER_RECEIVED]);
  });

  it("should shape the dashboard KPI summary contract", () => {
    const summary: ApplicationsKpiSummary = {
      respondedCount: 2,
      responseRate: 67,
      statusCounts: {
        draft: 1,
        interview_scheduled: 1,
        offer_received: 1,
        rejected: 0,
        sent: 1,
      },
      totalCount: 3,
    };

    expect(summary.responseRate).toBe(67);
    expect(summary.statusCounts.sent).toBe(1);
  });

  it("should shape the normalized CV and letter template content contracts", () => {
    const cvContent: CVDocumentContent = {
      candidate: {
        city: "Paris",
        email: "jane@example.com",
        firstName: "Jane",
        github: "github.com/jane",
        lastName: "Doe",
        linkedin: "linkedin.com/in/jane",
        phone: "+33 6 00 00 00 00",
        summary: "Product engineer with eight years of SaaS experience.",
        title: "Senior Product Engineer",
      },
      certifications: [
        {
          issuer: "AWS",
          title: "Solutions Architect Associate",
          year: "2025",
        },
      ],
      education: [
        {
          degree: "Master Informatique",
          institution: "Universite de Lille",
          mention: "Bien",
          year: "2018",
        },
      ],
      experiences: [
        {
          achievements: ["Reduced page load by 28%"],
          company: "CVforge",
          description: "Led the candidate experience roadmap.",
          endDate: "Present",
          position: "Staff Engineer",
          startDate: "2023",
        },
      ],
      languages: [
        {
          language: "English",
          level: "C1",
        },
      ],
      projects: [
        {
          description: "Built a reusable document editor foundation.",
          title: "Template Studio",
          url: "https://example.com/template-studio",
        },
      ],
      skills: {
        hard: ["TypeScript", "React"],
        soft: ["Facilitation", "Mentoring"],
      },
    };

    const letterContent: LetterDocumentContent = {
      body: {
        paragraph1: "I am applying for your senior frontend role.",
        paragraph2:
          "My experience aligns with the product challenges described.",
        paragraph3: "I would welcome the opportunity to discuss this further.",
      },
      candidate: {
        city: "Paris",
        email: "jane@example.com",
        firstName: "Jane",
        github: "github.com/jane",
        lastName: "Doe",
        linkedin: "linkedin.com/in/jane",
        phone: "+33 6 00 00 00 00",
        title: "Senior Product Engineer",
      },
      company: {
        city: "Lyon",
        name: "Example Corp",
      },
      date: "2026-04-20",
      object: "Candidature au poste de Senior Frontend Engineer",
      signature: {
        firstName: "Jane",
        lastName: "Doe",
      },
    };

    expect(cvContent.skills.hard).toContain("TypeScript");
    expect(letterContent.company.name).toBe("Example Corp");
    expect(TEMPLATE_KIND_CV).toBe("cv");
    expect(TEMPLATE_KIND_LETTER).toBe("letter");
    expect(DIVIDER_STYLE_SOLID).toBe("solid");
    expect(SECTION_TITLE_STYLE_ACCENT).toBe("accent");

    const updateRequest: CvContentUpdateRequest = {
      cvContent,
    };
    const letterUpdateRequest: LetterContentUpdateRequest = {
      letterContent,
    };

    expect(updateRequest.cvContent.candidate.firstName).toBe("Jane");
    expect(letterUpdateRequest.letterContent.signature.lastName).toBe("Doe");
  });

  it("should shape the admin template record contract", () => {
    const template: TemplateRecord = {
      active: true,
      categories: ["ATS", "Minimaliste"],
      createdAt: "2026-04-20T12:00:00.000Z",
      id: "template_123",
      isDefault: true,
      kind: TEMPLATE_KIND_CV,
      layout: {
        content: [
          {
            type: "CVHeader",
            props: {
              id: "cv-header",
              firstName: "Jane",
              lastName: "Doe",
            },
          },
        ],
        root: { props: {} },
      },
      locale: "fr",
      name: "CV ATS par defaut",
      updatedAt: "2026-04-20T12:00:00.000Z",
    };
    const templateInput: TemplateUpsertInput = {
      categories: ["Moderne"],
      isDefault: false,
      kind: TEMPLATE_KIND_LETTER,
      layout: {
        content: [],
        root: { props: {} },
      },
      locale: "en",
      name: "LM moderne",
    };

    expect(template.kind).toBe("cv");
    expect(template.layout.content[0]?.type).toBe("CVHeader");
    expect(templateInput.kind).toBe("letter");
  });
});
