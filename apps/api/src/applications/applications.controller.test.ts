import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

const baseApp = {
  createdAt: "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: "app_123",
  letterGeneratedAt: null,
  offerTextPreview: "Preview",
  offerUrl: "https://example.com/jobs/123",
  sourceLabel: "https://example.com/jobs/123",
  sourceType: "url",
  status: "draft",
  statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" }],
  updatedAt: "2026-04-20T12:00:00.000Z",
  userEmail: "user@example.com",
  extracted: {
    companyName: "Example Corp",
    contractType: null,
    language: "fr",
    location: null,
    requirements: [],
    responsibilities: [],
    salaryRange: null,
    summary: "Summary",
    title: "Backend Engineer",
  },
};

describe("ApplicationsController", () => {
  it("returns a single application by id for the authenticated user", () => {
    const applicationsService = {
      getApplicationForUser: vi.fn().mockReturnValue(baseApp),
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        role: "user",
      }),
    } as unknown as AuthService;
    const controller = new ApplicationsController(applicationsService, authService);

    const result = controller.getApplication("app_123", {
      headers: { cookie: "cvforge_session=abc" },
    });

    expect(result).toEqual({ application: baseApp });
    expect(applicationsService.getApplicationForUser).toHaveBeenCalledWith(
      "user@example.com",
      "app_123",
    );
  });

  it("rejects unauthenticated getApplication", () => {
    const applicationsService = {
      getApplicationForUser: vi.fn(),
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue(null),
    } as unknown as AuthService;
    const controller = new ApplicationsController(applicationsService, authService);

    expect(() =>
      controller.getApplication("app_123", { headers: {} }),
    ).toThrow(UnauthorizedException);
  });

  it("imports an application for the authenticated user", async () => {
    const applicationsService = {
      getApplicationForUser: vi.fn(),
      importFromText: vi.fn(),
      importFromUrl: vi.fn().mockResolvedValue({
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "app_123",
        offerTextPreview: "Preview",
        offerUrl: "https://example.com/jobs/123",
        sourceLabel: "https://example.com/jobs/123",
        sourceType: "url",
        status: "draft",
        statusHistory: [
          {
            changedAt: "2026-04-20T12:00:00.000Z",
            status: "draft",
          },
        ],
        updatedAt: "2026-04-20T12:00:00.000Z",
        userEmail: "user@example.com",
        extracted: {
          companyName: "Example Corp",
          contractType: null,
          language: "fr",
          location: null,
          requirements: [],
          responsibilities: [],
          salaryRange: null,
          summary: "Summary",
          title: "Backend Engineer",
        },
      }),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        role: "user",
      }),
    } as unknown as AuthService;
    const controller = new ApplicationsController(
      applicationsService,
      authService,
    );

    const response = await controller.importFromUrl(
      { url: "https://example.com/jobs/123" },
      { headers: { cookie: "cvforge_session=abc" } },
    );

    expect(response.application).toMatchObject({
      userEmail: "user@example.com",
      offerUrl: "https://example.com/jobs/123",
    });
  });

  it("lists applications for the authenticated user", () => {
    const applicationsService = {
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn().mockReturnValue([{ id: "app_123" }]),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        role: "user",
      }),
    } as unknown as AuthService;
    const controller = new ApplicationsController(
      applicationsService,
      authService,
    );

    expect(
      controller.listApplications({ headers: { cookie: "cvforge_session=abc" } }),
    ).toEqual({
      applications: [{ id: "app_123" }],
    });
  });

  it("rejects unauthenticated access", async () => {
    const applicationsService = {
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue(null),
    } as unknown as AuthService;
    const controller = new ApplicationsController(
      applicationsService,
      authService,
    );

    await expect(
      controller.importFromUrl(
        { url: "https://example.com/jobs/123" },
        { headers: {} },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("imports an application from pasted offer text", async () => {
    const applicationsService = {
      importFromText: vi.fn().mockResolvedValue({
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "app_124",
        offerTextPreview: "Preview",
        offerUrl: null,
        sourceLabel: "Texte colle manuellement",
        sourceType: "text",
        status: "draft",
        statusHistory: [
          {
            changedAt: "2026-04-20T12:00:00.000Z",
            status: "draft",
          },
        ],
        updatedAt: "2026-04-20T12:00:00.000Z",
        userEmail: "user@example.com",
        extracted: {
          companyName: null,
          contractType: null,
          language: "fr",
          location: null,
          requirements: [],
          responsibilities: [],
          salaryRange: null,
          summary: "Summary",
          title: "Backend Engineer",
        },
      }),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        role: "user",
      }),
    } as unknown as AuthService;
    const controller = new ApplicationsController(
      applicationsService,
      authService,
    );

    const response = await controller.importFromText(
      {
        offerText:
          "Senior backend role with enough detail to satisfy the minimum text threshold and create a candidature draft safely.",
      },
      { headers: { cookie: "cvforge_session=abc" } },
    );

    expect(response.application).toMatchObject({
      offerUrl: null,
      sourceType: "text",
      userEmail: "user@example.com",
    });
  });

  it("lists KPI summary data for the authenticated user", () => {
    const applicationsService = {
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn().mockReturnValue({
        respondedCount: 1,
        responseRate: 50,
        statusCounts: {
          draft: 1,
          interview_scheduled: 1,
          offer_received: 0,
          rejected: 0,
          sent: 0,
        },
        totalCount: 2,
      }),
      listApplications: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        role: "user",
      }),
    } as unknown as AuthService;
    const controller = new ApplicationsController(
      applicationsService,
      authService,
    );

    expect(
      controller.listSummary({ headers: { cookie: "cvforge_session=abc" } }),
    ).toEqual({
      summary: {
        respondedCount: 1,
        responseRate: 50,
        statusCounts: {
          draft: 1,
          interview_scheduled: 1,
          offer_received: 0,
          rejected: 0,
          sent: 0,
        },
        totalCount: 2,
      },
    });
  });

  it("updates an application status for the authenticated user", () => {
    const applicationsService = {
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      listApplicationSummary: vi.fn(),
      listApplications: vi.fn(),
      updateStatus: vi.fn().mockReturnValue({
        id: "app_123",
        status: "sent",
      }),
    } as unknown as ApplicationsService;
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "user@example.com",
        role: "user",
      }),
    } as unknown as AuthService;
    const controller = new ApplicationsController(
      applicationsService,
      authService,
    );

    expect(
      controller.updateStatus(
        "app_123",
        { status: "sent" },
        { headers: { cookie: "cvforge_session=abc" } },
      ),
    ).toEqual({
      application: {
        id: "app_123",
        status: "sent",
      },
    });
  });
});
