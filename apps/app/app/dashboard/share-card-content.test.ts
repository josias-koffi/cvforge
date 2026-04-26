import { describe, expect, it } from "vitest";
import {
  buildDashboardShareCardSvg,
  buildDashboardSharePageUrl,
  buildShareLegend,
  buildLinkedInShareUrl,
  parseDashboardShareCardData,
  serializeDashboardShareCardData,
} from "./share-card-content";

describe("dashboard share card content", () => {
  const baseData = {
    averageAtsScore: 82,
    averageInterviewScore: 8,
    generatedAt: "24 avr. 2026",
    interviewCount: 3,
    offerCount: 1,
    responseRate: 67,
    totalApplications: 9,
  };

  it("builds a branded svg card from dashboard metrics", () => {
    const svg = buildDashboardShareCardSvg(baseData);

    expect(svg).toContain("Mon tableau de bord candidature");
    expect(svg).toContain("24 avr. 2026");
    expect(svg).toContain("67%");
    expect(svg).toContain("82/100");
    expect(svg).toContain("8/10");
  });

  it("encodes the offsite LinkedIn sharing url", () => {
    expect(buildLinkedInShareUrl("https://app.cvforge.test/dashboard")).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fapp.cvforge.test%2Fdashboard",
    );
  });

  it("serializes and parses the public share payload", () => {
    const serialized = serializeDashboardShareCardData(baseData);
    const parsed = parseDashboardShareCardData(new URLSearchParams(serialized));

    expect(parsed).toEqual(baseData);
    expect(buildDashboardSharePageUrl("https://app.cvforge.test", baseData)).toContain(
      "/share/dashboard?",
    );
  });

  it("builds a share legend that users can paste into LinkedIn", () => {
    expect(buildShareLegend(baseData)).toContain("Taux de reponse: 67%");
    expect(buildShareLegend(baseData)).toContain("Carte generee depuis mon tableau de bord CVforge.");
  });
});
