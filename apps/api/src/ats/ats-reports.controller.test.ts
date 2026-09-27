import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import { AtsReportsController } from "./ats-reports.controller";
import type { AtsReportsService } from "./ats-reports.service";

function createController(session: { email: string } | null) {
  const reports = {
    get: vi.fn().mockResolvedValue({ scanId: "scan" }),
    list: vi.fn().mockResolvedValue([{ scanId: "scan" }]),
  };
  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue(session),
  };

  return {
    controller: new AtsReportsController(
      authService as unknown as AuthService,
      reports as unknown as AtsReportsService,
    ),
    reports,
  };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("AtsReportsController", () => {
  it("lists the reports of the signed-in address", async () => {
    const { controller, reports } = createController({
      email: "lead@example.com",
    });

    await expect(controller.list(request)).resolves.toEqual({
      scans: [{ scanId: "scan" }],
    });
    expect(reports.list).toHaveBeenCalledWith("lead@example.com");
  });

  it("reads one report for the signed-in address only", async () => {
    const { controller, reports } = createController({
      email: "lead@example.com",
    });

    await controller.get(request, "scan");

    expect(reports.get).toHaveBeenCalledWith("lead@example.com", "scan");
  });

  it("refuses a caller without a session", () => {
    const { controller } = createController(null);

    expect(() => controller.get(request, "scan")).toThrow(
      UnauthorizedException,
    );
  });
});
