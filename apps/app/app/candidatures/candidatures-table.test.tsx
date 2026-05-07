import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./generate-cv-button", () => ({
  GenerateCvButton: () => <button type="button">Générer CV</button>,
}));
vi.mock("./generate-letter-button", () => ({
  GenerateLetterButton: () => <button type="button">Générer LM</button>,
}));
vi.mock("./application-profile-selector", () => ({
  ApplicationProfileSelector: () => <div>Profil</div>,
}));

import { CandidaturesTable } from "./candidatures-table";

const makeApp = (overrides: Partial<{
  id: string;
  title: string;
  company: string;
  status: "draft" | "sent" | "interview_scheduled" | "rejected" | "offer_received";
  createdAt: string;
  score: number | null;
}> = {}) => ({
  createdAt: overrides.createdAt ?? "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: overrides.id ?? "app_1",
  interviewReports: overrides.score !== undefined && overrides.score !== null
    ? [{ createdAt: "2026-04-20T12:00:00.000Z", improvements: [], metrics: [], overallScore: overrides.score, summary: "", transcriptStats: { averageResponseDurationSeconds: null, hesitationCount: 0, keywordCoverage: 0, keywordMentions: [], responseCount: 0 } }]
    : [],
  letterGeneratedAt: null,
  offerTextPreview: "preview",
  offerUrl: null,
  sourceLabel: "text",
  sourceType: "text" as const,
  status: overrides.status ?? "draft" as const,
  statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: (overrides.status ?? "draft") as "draft" }],
  updatedAt: "2026-04-20T12:00:00.000Z",
  userEmail: "user@example.com",
  extracted: {
    companyName: overrides.company ?? "Acme Corp",
    contractType: "CDI",
    language: "fr",
    location: "Paris",
    requirements: [],
    responsibilities: [],
    salaryRange: null,
    summary: "desc",
    title: overrides.title ?? "Dev Backend",
  },
});

describe("CandidaturesTable", () => {
  it("renders table headers", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[]} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("Poste");
    expect(markup).toContain("Entreprise");
    expect(markup).toContain("Statut");
    expect(markup).toContain("Date");
    expect(markup).toContain("Score entretien");
    expect(markup).toContain("Actions");
  });

  it("renders th with aria-sort attribute", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[]} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain('aria-sort="descending"');
    expect(markup).toContain('aria-sort="none"');
    expect(markup).toContain('scope="col"');
  });

  it("renders application rows", () => {
    const apps = [makeApp({ title: "Lead Fullstack", company: "Beta Inc" })];
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={apps} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("Lead Fullstack");
    expect(markup).toContain("Beta Inc");
    expect(markup).toContain("Brouillon");
  });

  it("renders interview score when available", () => {
    const apps = [makeApp({ score: 78 })];
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={apps} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("78/100");
  });

  it("renders dash when no interview score", () => {
    const apps = [makeApp({ score: null })];
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={apps} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("—");
  });

  it("renders + Nouvelle candidature CTA", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[]} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("+ Nouvelle candidature");
  });

  it("renders empty state when no applications", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[]} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("Aucune candidature ne correspond");
  });

  it("renders pagination when more than 20 items", () => {
    const apps = Array.from({ length: 25 }, (_, i) =>
      makeApp({ id: `app_${i}`, title: `Job ${i}` }),
    );
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={apps} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("Précédent");
    expect(markup).toContain("Suivant");
    expect(markup).toContain("Page 1 / 2");
  });

  it("does not render pagination when 20 or fewer items", () => {
    const apps = Array.from({ length: 20 }, (_, i) =>
      makeApp({ id: `app_${i}`, title: `Job ${i}` }),
    );
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={apps} sessionEmail="u@x.com" />,
    );
    expect(markup).not.toContain("Précédent");
  });

  it("renders filter bar with all status checkboxes", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[]} sessionEmail="u@x.com" />,
    );
    expect(markup).toContain("Brouillon");
    expect(markup).toContain("Envoyee");
    expect(markup).toContain("Entretien");
    expect(markup).toContain("Recherche");
    expect(markup).toContain("Date de");
  });

  it("slide-over is not rendered initially (selectedApp is null)", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[makeApp()]} sessionEmail="u@x.com" />,
    );
    expect(markup).not.toContain('role="dialog"');
  });

  it("modal is not rendered initially (modalOpen is false)", () => {
    const markup = renderToStaticMarkup(
      <CandidaturesTable applications={[]} sessionEmail="u@x.com" />,
    );
    expect(markup).not.toContain("Nouvelle candidature\n");
    expect(markup).not.toContain("Fallback texte");
  });
});
