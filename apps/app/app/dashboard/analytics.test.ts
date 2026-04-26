import { describe, expect, it } from "vitest";
import type { CVDocumentVersionEntry } from "@cvforge/types";
import {
  buildAtsInsights,
  buildInterviewInsights,
  buildMonthlyTrend,
  buildStatusSegments,
  scoreCvVersionAgainstOffer,
  type DashboardApplication,
} from "./analytics";

function createCvVersion(
  versionNumber: number,
  summary: string,
  hardSkills: string[],
): CVDocumentVersionEntry {
  return {
    content: {
      candidate: {
        city: "Paris",
        email: "user@example.com",
        firstName: "Ada",
        github: "ada",
        lastName: "Lovelace",
        linkedin: "ada",
        phone: "000",
        summary,
        title: "Product Engineer",
      },
      certifications: [],
      education: [],
      experiences: [
        {
          achievements: ["Pilotage KPI", "Tableaux de bord"],
          company: "Acme",
          description: summary,
          endDate: "2026",
          position: "Product Engineer",
          startDate: "2024",
        },
      ],
      languages: [],
      projects: [],
      skills: {
        hard: hardSkills,
        soft: ["Communication"],
      },
    },
    createdAt: `2026-04-0${versionNumber}T10:00:00.000Z`,
    id: `cv-v${versionNumber}`,
    source: versionNumber === 1 ? "generation" : "manual_save",
    templateId: "template-cv-ats",
    versionNumber,
  };
}

const baseApplication: DashboardApplication = {
  createdAt: "2026-04-01T10:00:00.000Z",
  cvGeneratedAt: "2026-04-01T10:00:00.000Z",
  extracted: {
    companyName: "Acme",
    contractType: null,
    language: "fr",
    location: "Paris",
    requirements: ["ATS", "analytics", "dashboard"],
    responsibilities: ["pilotage KPI", "candidatures"],
    salaryRange: null,
    summary: "Role analytics dashboard ATS",
    title: "Senior Product Engineer",
  },
  id: "app-1",
  offerTextPreview: "preview",
  offerUrl: "https://example.com/job",
  sourceLabel: "Acme",
  sourceType: "url",
  status: "sent",
  statusHistory: [
    {
      changedAt: "2026-04-01T10:00:00.000Z",
      status: "sent",
    },
  ],
  updatedAt: "2026-04-02T10:00:00.000Z",
  userEmail: "user@example.com",
};

describe("dashboard analytics", () => {
  it("scores ATS progression from CV versions against offer keywords", () => {
    const application: DashboardApplication = {
      ...baseApplication,
      cvVersions: [
        createCvVersion(1, "Backend generaliste sans ATS", ["Node.js"]),
        createCvVersion(2, "ATS analytics dashboard KPI candidature", [
          "ATS",
          "analytics",
          "dashboard",
        ]),
      ],
    };

    const firstScore = scoreCvVersionAgainstOffer(application, application.cvVersions![0]);
    const secondScore = scoreCvVersionAgainstOffer(application, application.cvVersions![1]);

    expect(firstScore).not.toBeNull();
    expect(secondScore).not.toBeNull();
    expect(secondScore!).toBeGreaterThan(firstScore!);

    const insights = buildAtsInsights([application]);

    expect(insights.focusApplicationTitle).toBe("Senior Product Engineer");
    expect(insights.points).toHaveLength(2);
    expect(insights.points[1]?.score).toBeGreaterThan(insights.points[0]?.score ?? 0);
    expect(insights.averageScore).toBe(insights.latestScores[0]?.score ?? null);
  });

  it("builds monthly trends, status segments, and interview history from product data", () => {
    const applications: DashboardApplication[] = [
      {
        ...baseApplication,
        createdAt: "2026-02-10T10:00:00.000Z",
        id: "app-feb",
        status: "draft",
        updatedAt: "2026-02-10T10:00:00.000Z",
      },
      {
        ...baseApplication,
        createdAt: "2026-03-11T10:00:00.000Z",
        id: "app-mar",
        interviewReports: [
          {
            createdAt: "2026-03-20T09:00:00.000Z",
            improvements: ["Structurer davantage la conclusion."],
            metrics: [],
            overallScore: 7,
            summary: "Bon entretien.",
            transcriptStats: {
              averageResponseDurationSeconds: 35,
              hesitationCount: 2,
              keywordCoverage: 50,
              keywordMentions: ["ats"],
              responseCount: 3,
            },
          },
          {
            createdAt: "2026-03-25T09:00:00.000Z",
            improvements: ["Mieux illustrer les resultats."],
            metrics: [],
            overallScore: 8,
            summary: "Entretien solide.",
            transcriptStats: {
              averageResponseDurationSeconds: 32,
              hesitationCount: 1,
              keywordCoverage: 70,
              keywordMentions: ["ats", "dashboard"],
              responseCount: 4,
            },
          },
        ],
        status: "interview_scheduled",
        updatedAt: "2026-03-12T10:00:00.000Z",
      },
      {
        ...baseApplication,
        createdAt: "2026-04-12T10:00:00.000Z",
        id: "app-apr",
        status: "offer_received",
        updatedAt: "2026-04-13T10:00:00.000Z",
      },
    ];

    const trend = buildMonthlyTrend(applications, new Date("2026-04-24T12:00:00.000Z"));
    const segments = buildStatusSegments(applications, {
      draft: "Brouillon",
      interview_scheduled: "Entretien planifie",
      offer_received: "Offre recue",
      rejected: "Refusee",
      sent: "Envoyee",
    });
    const interviews = buildInterviewInsights(applications);

    expect(trend).toHaveLength(6);
    expect(trend.at(-1)).toMatchObject({ value: 1 });
    expect(segments.find((segment) => segment.status === "draft")?.count).toBe(1);
    expect(
      segments.find((segment) => segment.status === "interview_scheduled")?.count,
    ).toBe(1);
    expect(interviews.points).toHaveLength(2);
    expect(interviews.averageScore).toBe(8);
  });
});
