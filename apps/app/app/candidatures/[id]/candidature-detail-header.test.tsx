import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CandidatureDetailHeader } from "./candidature-detail-header";

const baseApp = {
  createdAt: "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: "app_abc",
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
    contractType: null,
    language: "fr" as const,
    location: null,
    requirements: [],
    responsibilities: [],
    salaryRange: null,
    summary: "Great job.",
    title: "Dev Backend",
  },
};

describe("CandidatureDetailHeader", () => {
  it("renders a status update form with valid next statuses", () => {
    const html = renderToStaticMarkup(<CandidatureDetailHeader application={baseApp} />);

    expect(html).toContain("Suivi de candidature");
    expect(html).toContain('name="returnTo"');
    expect(html).toContain("/candidatures/app_abc");
    expect(html).toContain("Marquer comme envoyee");
    expect(html).toContain("Mettre a jour");
  });

  it("renders success feedback after status update redirect", () => {
    const html = renderToStaticMarkup(
      <CandidatureDetailHeader application={baseApp} statusUpdated />,
    );

    expect(html).toContain("Suivi mis a jour.");
  });

  it("renders a readable error message after failed status update redirect", () => {
    const html = renderToStaticMarkup(
      <CandidatureDetailHeader application={baseApp} statusError="status_transition_forbidden" />,
    );

    expect(html).toContain("Cette transition de suivi n&#x27;est pas autorisee.");
  });

  it("shows a final state when no next status is available", () => {
    const app = { ...baseApp, status: "rejected" as const };
    const html = renderToStaticMarkup(<CandidatureDetailHeader application={app} />);

    expect(html).toContain("Suivi finalise");
    expect(html).not.toContain("Mettre a jour");
  });
});
