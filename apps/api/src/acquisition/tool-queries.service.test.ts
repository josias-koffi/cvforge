import type {
  PublicCompanyCheckResponse,
  PublicJobMarketResponse,
} from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import { ToolQueriesService } from "./tool-queries.service";

const NOW = () => Date.parse("2026-09-25T08:00:00.000Z");

function service(increment = vi.fn().mockResolvedValue(undefined)) {
  return {
    increment,
    service: new ToolQueriesService({ deleteBefore: vi.fn(), increment }, NOW),
  };
}

describe("ToolQueriesService", () => {
  it("counts a company found, under its SIREN", () => {
    const { increment, service: queries } = service();

    queries.countCompany({
      company: { legalName: "HELPLINE", siren: "381983568" },
      status: "found",
    } as PublicCompanyCheckResponse);

    expect(increment).toHaveBeenCalledWith({
      day: "2026-09-25",
      label: "HELPLINE",
      place: "",
      queryKey: "381983568",
      tool: "company_check",
    });
  });

  it("does not count a SIREN that matched nothing", () => {
    const { increment, service: queries } = service();

    queries.countCompany({ status: "unknown" });

    expect(increment).not.toHaveBeenCalled();
  });

  it("counts a job with the department it was searched in", () => {
    const { increment, service: queries } = service();

    queries.countJob({
      appellation: { code: "38874", libelle: "Développeur web" },
      departmentLabel: "Loire-Atlantique",
    } as PublicJobMarketResponse);

    expect(increment).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Développeur web",
        place: "Loire-Atlantique",
        queryKey: "38874",
        tool: "job_market",
      }),
    );
  });

  it("never lets a failed write reach the visitor", async () => {
    const { service: queries } = service(
      vi.fn().mockRejectedValue(new Error("db down")),
    );

    expect(() =>
      queries.countCompany({
        company: { legalName: "X", siren: "1" },
        status: "found",
      } as PublicCompanyCheckResponse),
    ).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
