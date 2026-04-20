import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_OFFER_RECEIVED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_SENT,
  APPLICATION_SOURCE_URL,
  applicationStatusTransitions,
  applicationStatuses,
  type ApplicationsKpiSummary,
  type DraftApplication,
  HEALTH_STATUS_OK,
  type Locale,
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
      id: "app_123",
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
    ).toEqual([
      APPLICATION_STATUS_REJECTED,
      APPLICATION_STATUS_OFFER_RECEIVED,
    ]);
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
});
