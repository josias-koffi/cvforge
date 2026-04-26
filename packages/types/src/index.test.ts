import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
  CREDIT_PACK_PRO,
  CREDIT_PACK_STARTER,
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_OFFER_RECEIVED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_SENT,
  APPLICATION_SOURCE_URL,
  DIVIDER_STYLE_SOLID,
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_PROFILE_BEHAVIORAL,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_COMPLETED,
  INTERVIEW_SESSION_STATUS_RECORDING,
  SECTION_TITLE_STYLE_ACCENT,
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  applicationStatusTransitions,
  applicationStatuses,
  interviewRecruiterProfiles,
  type CVDocumentContent,
  type CvContentUpdateRequest,
  type LetterContentUpdateRequest,
  type ApplicationsKpiSummary,
  creditPackIds,
  creditPacks,
  type CreateCheckoutSessionRequest,
  type CreateCheckoutSessionResponse,
  type DraftApplication,
  HEALTH_STATUS_OK,
  type InAppNotification,
  type InterviewSessionStartResponse,
  type InterviewSessionStartRequest,
  type InterviewTranscriptionChunkRequest,
  type LetterDocumentContent,
  type Locale,
  type NotificationSummary,
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

  it("should shape the interview streaming transcription contracts", () => {
    const startRequest: InterviewSessionStartRequest = {
      language: "fr",
      profile: INTERVIEW_PROFILE_STANDARD,
    };
    const chunk: InterviewTranscriptionChunkRequest = {
      chunkBase64: "UklGRiQAAABXQVZF",
      chunkId: "chunk-001",
      endedAt: "2026-04-24T13:00:00.500Z",
      format: "webm",
      isFinal: false,
      mimeType: "audio/webm",
      sequence: 1,
      startedAt: "2026-04-24T13:00:00.000Z",
    };

    const response: InterviewSessionStartResponse = {
      session: {
        aiResponse: null,
        aiResponseGeneratedAt: null,
        aiStatus: INTERVIEW_AI_STATUS_IDLE,
        chunks: [
          {
            chunkId: "chunk-001",
            createdAt: "2026-04-24T13:00:00.600Z",
            endedAt: "2026-04-24T13:00:00.500Z",
            errorMessage: null,
            isFinal: false,
            mimeType: "audio/webm",
            sequence: 1,
            startedAt: "2026-04-24T13:00:00.000Z",
            status: INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
            transcript: "bonjour",
          },
        ],
        completedAt: null,
        createdAt: "2026-04-24T13:00:00.000Z",
        id: "session-001",
        language: "fr",
        lastError: null,
        profile: INTERVIEW_PROFILE_STANDARD,
        recoverable: true,
        status: INTERVIEW_SESSION_STATUS_RECORDING,
        transcript: "bonjour",
        updatedAt: "2026-04-24T13:00:00.600Z",
      },
      sessionId: "session-001",
    };

    expect(startRequest.language).toBe("fr");
    expect(chunk.sequence).toBe(1);
    expect(response.session.status).toBe("recording");
    expect(response.session.chunks[0]?.transcript).toBe("bonjour");
    expect(response.session.language).toBe("fr");
    expect(response.session.profile).toBe(INTERVIEW_PROFILE_STANDARD);
  });

  it("should expose the interview recruiter profiles and completion state", () => {
    expect(interviewRecruiterProfiles).toEqual([
      "standard",
      "aggressive",
      "passive",
      "technical",
      "behavioral",
    ]);

    const completedSession: InterviewSessionStartResponse = {
      session: {
        aiResponse: "Merci, nous avons termine.",
        aiResponseGeneratedAt: "2026-04-24T13:10:00.000Z",
        aiStatus: INTERVIEW_AI_STATUS_IDLE,
        chunks: [],
        completedAt: "2026-04-24T13:11:00.000Z",
        createdAt: "2026-04-24T13:00:00.000Z",
        id: "session-002",
        language: "en",
        lastError: null,
        profile: INTERVIEW_PROFILE_BEHAVIORAL,
        recoverable: false,
        status: INTERVIEW_SESSION_STATUS_COMPLETED,
        transcript: "Thank you for your time.",
        updatedAt: "2026-04-24T13:11:00.000Z",
      },
      sessionId: "session-002",
    };

    expect(completedSession.session.completedAt).toBeTruthy();
    expect(completedSession.session.profile).toBe("behavioral");
    expect(completedSession.session.status).toBe("completed");
  });

  it("should expose the supported credit packs", () => {
    const request: CreateCheckoutSessionRequest = {
      packId: CREDIT_PACK_STARTER,
    };
    const response: CreateCheckoutSessionResponse = {
      checkoutUrl: "https://checkout.stripe.com/c/session_123",
      sessionId: "cs_test_123",
    };

    expect(creditPackIds).toEqual([CREDIT_PACK_STARTER, CREDIT_PACK_PRO]);
    expect(creditPacks.starter.priceCents).toBe(999);
    expect(creditPacks.pro.credits).toBe(1400);
    expect(request.packId).toBe("starter");
    expect(response.sessionId).toContain("cs_test_");
  });

  it("should shape the in-app notification contracts", () => {
    const notification: InAppNotification = {
      createdAt: "2026-04-22T08:00:00.000Z",
      id: "notif_123",
      linkHref: "/candidatures?applicationId=app_123",
      message: "Relancez cette candidature apres 7 jours sans reponse.",
      metadata: {
        applicationId: "app_123",
      },
      readAt: null,
      title: "Relancer Acme",
      type: NOTIFICATION_TYPE_APPLICATION_FOLLOW_UP,
      userEmail: "user@example.com",
    };
    const summary: NotificationSummary = {
      unreadCount: 1,
    };

    expect(notification.type).toBe("application_follow_up");
    expect(notification.metadata.applicationId).toBe("app_123");
    expect(summary.unreadCount).toBe(1);
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
