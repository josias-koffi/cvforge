import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_DRAFT,
  APPLICATION_SOURCE_URL,
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
  });
});
