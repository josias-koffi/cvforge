import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CandidatureDetailTabs } from "./candidature-detail-tabs";

const baseApp = {
  createdAt: "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: "app_abc",
  interviewReports: [],
  letterGeneratedAt: null,
  offerTextPreview: "preview",
  offerUrl: "https://example.com/jobs/1",
  sourceLabel: "url",
  sourceType: "url" as const,
  status: "draft" as const,
  statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" as const }],
  updatedAt: "2026-04-20T12:00:00.000Z",
  userEmail: "user@example.com",
  extracted: {
    companyName: "Acme Corp",
    contractType: "CDI",
    language: "fr" as const,
    location: "Paris",
    requirements: ["Req A", "Req B"],
    responsibilities: ["Resp 1"],
    salaryRange: "50k€",
    summary: "Great job at Acme.",
    title: "Dev Backend",
  },
};

describe("CandidatureDetailTabs", () => {
  it("renders the application title and company in the header", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("Dev Backend");
    expect(html).toContain("Acme Corp");
  });

  it("renders the status badge", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("Brouillon");
  });

  it("renders the creation date", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("20 avr. 2026");
  });

  it("renders all five tab buttons", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("Offre");
    expect(html).toContain("CV");
    expect(html).toContain("LM");
    expect(html).toContain("Interviews");
    expect(html).toContain("Historique");
  });

  it("shows the offer summary in the Offre tab by default", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("Great job at Acme.");
  });

  it("renders location, contractType and salaryRange chips in Offre tab", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("Paris");
    expect(html).toContain("CDI");
    expect(html).toContain("50k€");
  });

  it("renders responsibilities and requirements in Offre tab", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("Resp 1");
    expect(html).toContain("Req A");
    expect(html).toContain("Req B");
  });

  it("renders offer URL link in Offre tab", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain("https://example.com/jobs/1");
  });

  it("shows 'Aucun CV généré' when cvGeneratedAt is null", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).not.toContain("Éditer le CV");
  });

  it("shows CV edit and PDF links when cvGeneratedAt is set", () => {
    const app = { ...baseApp, cvGeneratedAt: "2026-04-21T00:00:00.000Z" };
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={app} />);
    expect(html).toContain(`/cv/${baseApp.id}`);
    expect(html).toContain(`/cv/${baseApp.id}/pdf`);
  });

  it("shows LM edit and PDF links when letterGeneratedAt is set", () => {
    const app = { ...baseApp, letterGeneratedAt: "2026-04-21T00:00:00.000Z" };
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={app} />);
    expect(html).toContain(`/letters/${baseApp.id}`);
    expect(html).toContain(`/letters/${baseApp.id}/pdf`);
  });

  it("renders the start interview link", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain(`/interview?candidatureId=${baseApp.id}`);
  });

  it("renders interview reports table when reports exist", () => {
    const app = {
      ...baseApp,
      interviewReports: [
        {
          createdAt: "2026-04-22T10:00:00.000Z",
          improvements: [],
          metrics: [],
          overallScore: 78,
          summary: "Good performance",
          transcriptStats: {
            averageResponseDurationSeconds: null,
            hesitationCount: 0,
            keywordCoverage: 0,
            keywordMentions: [],
            responseCount: 3,
          },
        },
      ],
    };
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={app} />);
    expect(html).toContain("78/100");
    expect(html).toContain("Good performance");
  });

  it("renders status history entries in the Historique tab", () => {
    const app = {
      ...baseApp,
      status: "sent" as const,
      statusHistory: [
        { changedAt: "2026-04-20T12:00:00.000Z", status: "draft" as const },
        { changedAt: "2026-04-21T12:00:00.000Z", status: "sent" as const },
      ],
    };
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={app} />);
    expect(html).toContain("Brouillon");
    expect(html).toContain("Envoyee");
  });

  it("renders all tabs with role and aria attributes", () => {
    const html = renderToStaticMarkup(<CandidatureDetailTabs application={baseApp} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-selected="true"');
  });
});
