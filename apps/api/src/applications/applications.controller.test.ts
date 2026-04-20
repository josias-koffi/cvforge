import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

describe("ApplicationsController", () => {
  it("imports an application for the authenticated user", async () => {
    const applicationsService = {
      importFromText: vi.fn(),
      importFromUrl: vi.fn().mockResolvedValue({
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "app_123",
        offerTextPreview: "Preview",
        offerUrl: "https://example.com/jobs/123",
        sourceLabel: "https://example.com/jobs/123",
        sourceType: "url",
        status: "draft",
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
      listApplications: vi.fn(),
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
      listApplications: vi.fn().mockReturnValue([{ id: "app_123" }]),
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
      listApplications: vi.fn(),
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
      listApplications: vi.fn(),
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
});
