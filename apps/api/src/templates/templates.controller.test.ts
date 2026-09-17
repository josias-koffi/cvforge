import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TemplatesController } from "./templates.controller";

describe("TemplatesController", () => {
  it("lists templates for an authenticated admin", async () => {
    const templatesService = {
      getAnalytics: vi
        .fn()
        .mockResolvedValue({ csv: "id\n", summary: { totalTemplates: 1 } }),
      listTemplates: vi.fn().mockResolvedValue([{ id: "template-cv" }]),
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

    await expect(controller.listTemplates({ headers: {} })).resolves.toEqual({
      templates: [{ id: "template-cv" }],
    });
  });

  it("rejects unauthenticated access", async () => {
    const controller = new TemplatesController(
      { listTemplates: vi.fn() } as never,
      {
        readSessionFromCookieHeader: vi.fn().mockReturnValue(null),
      } as never,
    );

    await expect(controller.listTemplates({ headers: {} })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects non-admin sessions", async () => {
    const controller = new TemplatesController(
      { listTemplates: vi.fn() } as never,
      {
        readSessionFromCookieHeader: vi.fn().mockReturnValue({
          email: "user@example.com",
          role: "user",
        }),
      } as never,
    );

    await expect(controller.listTemplates({ headers: {} })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("deletes a template for an authenticated admin", async () => {
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

    await controller.deleteTemplate("template-cv-ats", { headers: {} });

    expect(deleteTemplate).toHaveBeenCalledWith("template-cv-ats");
  });

  it("returns analytics for an authenticated admin", async () => {
    const getAnalytics = vi.fn().mockResolvedValue({
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

    await expect(controller.getAnalytics({ headers: {} })).resolves.toEqual({
      csv: "templateId\n",
      summary: { totalTemplates: 2 },
    });
  });
});
