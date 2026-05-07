import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./generate-cv-button", () => ({
  GenerateCvButton: () => <button type="button">Générer CV</button>,
}));
vi.mock("./generate-letter-button", () => ({
  GenerateLetterButton: () => <button type="button">Générer LM</button>,
}));
vi.mock("./application-profile-selector", () => ({
  ApplicationProfileSelector: () => <div>Profil actif pour cette candidature</div>,
}));

import { CandidaturesSlideOver } from "./candidatures-slide-over";

const baseApp = {
  createdAt: "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: "app_123",
  interviewReports: [],
  letterGeneratedAt: null,
  offerTextPreview: "preview",
  offerUrl: null,
  sourceLabel: "text",
  sourceType: "text" as const,
  status: "draft" as const,
  statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" as const }],
  updatedAt: "2026-04-20T12:00:00.000Z",
  userEmail: "user@example.com",
  extracted: {
    companyName: "Acme Corp",
    contractType: "CDI",
    language: "fr",
    location: "Paris",
    requirements: [],
    responsibilities: [],
    salaryRange: "45k–55k",
    summary: "desc",
    title: "Dev Backend",
  },
};

describe("CandidaturesSlideOver", () => {
  it("renders with role=dialog and aria-modal", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-label="Détail de la candidature"');
  });

  it("renders application title and company", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("Dev Backend");
    expect(markup).toContain("Acme Corp");
    expect(markup).toContain("Paris");
  });

  it("renders status badge", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("Brouillon");
  });

  it("renders interview score when present", () => {
    const appWithScore = {
      ...baseApp,
      interviewReports: [
        {
          createdAt: "2026-04-20T12:00:00.000Z",
          improvements: [],
          metrics: [],
          overallScore: 82,
          summary: "",
          transcriptStats: {
            averageResponseDurationSeconds: null,
            hesitationCount: 0,
            keywordCoverage: 0,
            keywordMentions: [],
            responseCount: 0,
          },
        },
      ],
    };
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={appWithScore}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("Score: 82/100");
  });

  it("renders status history", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("Historique des statuts");
  });

  it("renders close button with aria-label", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain('aria-label="Fermer le détail"');
  });

  it("renders salary when present", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("45k–55k");
  });

  it("renders profile selector", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("Profil actif pour cette candidature");
  });

  it("renders detail link", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={baseApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("/candidatures/app_123");
  });

  it("renders terminal state message when no transitions", () => {
    const terminalApp = { ...baseApp, status: "offer_received" as const };
    const markup = renderToStaticMarkup(
      <CandidaturesSlideOver
        application={terminalApp}
        onClose={() => {}}
        sessionEmail="u@x.com"
      />,
    );
    expect(markup).toContain("Statut terminal");
  });
});
