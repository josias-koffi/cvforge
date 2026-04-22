import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TemplatesController } from "./templates.controller";

describe("TemplatesController", () => {
  it("lists templates for an authenticated admin", () => {
    const templatesService = {
      getAnalytics: vi.fn().mockReturnValue({ csv: "id\n", summary: { totalTemplates: 1 } }),
      listTemplates: vi.fn().mockReturnValue([{ id: "template-cv" }]),
    };
    const authService = {
      readSessionFromCookieHeader: vi.fn().mockReturnValue({
        email: "admin@example.com",
        role: "admin",
      }),
    };
    const controller = new TemplatesController(
      templatesService as never,
      authService as never,
    );

    expect(controller.listTemplates({ headers: {} })).toEqual({
      templates: [{ id: "template-cv" }],
    });
  });

  it("rejects unauthenticated access", () => {
    const controller = new TemplatesController(
      { listTemplates: vi.fn() } as never,
      {
        readSessionFromCookieHeader: vi.fn().mockReturnValue(null),
      } as never,
    );

    expect(() => controller.listTemplates({ headers: {} })).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects non-admin sessions", () => {
    const controller = new TemplatesController(
      { listTemplates: vi.fn() } as never,
      {
        readSessionFromCookieHeader: vi.fn().mockReturnValue({
          email: "user@example.com",
          role: "user",
        }),
      } as never,
    );

    expect(() => controller.listTemplates({ headers: {} })).toThrow(
      ForbiddenException,
    );
  });

  it("deletes a template for an authenticated admin", () => {
    const deleteTemplate = vi.fn();
    const controller = new TemplatesController(
      { deleteTemplate } as never,
      {
        readSessionFromCookieHeader: vi.fn().mockReturnValue({
          email: "admin@example.com",
          role: "admin",
        }),
      } as never,
    );

    controller.deleteTemplate("template-cv-ats", { headers: {} });

    expect(deleteTemplate).toHaveBeenCalledWith("template-cv-ats");
  });

  it("returns analytics for an authenticated admin", () => {
    const getAnalytics = vi.fn().mockReturnValue({
      csv: "templateId\n",
      summary: { totalTemplates: 2 },
    });
    const controller = new TemplatesController(
      { getAnalytics } as never,
      {
        readSessionFromCookieHeader: vi.fn().mockReturnValue({
          email: "admin@example.com",
          role: "admin",
        }),
      } as never,
    );

    expect(controller.getAnalytics({ headers: {} })).toEqual({
      csv: "templateId\n",
      summary: { totalTemplates: 2 },
    });
  });
});
