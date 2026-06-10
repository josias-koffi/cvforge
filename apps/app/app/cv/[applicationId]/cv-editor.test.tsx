import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CvEditor } from "./cv-editor";
import type { CVDocumentContent } from "@cvforge/types";

const sampleCvContent: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "alice@example.com",
    firstName: "Alice",
    github: "",
    lastName: "Martin",
    linkedin: "",
    phone: "+33600000000",
    summary: "Expert TypeScript developer",
    title: "Engineer",
  },
  certifications: [],
  education: [],
  experiences: [
    {
      achievements: ["Reduced latency"],
      company: "CVforge",
      description: "Built document workflows",
      endDate: "2026",
      position: "Engineer",
      startDate: "2024",
    },
  ],
  interests: "Lecture",
  languages: [{ language: "Français", level: "C2" }],
  projects: [],
  skills: { hard: ["TypeScript"], soft: ["Communication"] },
};

describe("CvEditor", () => {
  it("renders the structured editor header and export buttons", () => {
    const markup = renderToStaticMarkup(
      <CvEditor applicationId="app-001" cvContent={sampleCvContent} />,
    );

    expect(markup).toContain("Edition WYSIWYG du CV");
    expect(markup).toContain("Sauvegarder le CV");
    expect(markup).toContain("Télécharger le PDF");
    expect(markup).toContain("Télécharger le DOCX");
  });

  it("renders CV version history when versions are provided", () => {
    const markup = renderToStaticMarkup(
      <CvEditor
        applicationId="app-001"
        cvContent={sampleCvContent}
        versions={[
          {
            content: sampleCvContent,
            createdAt: "2026-04-23T10:00:00.000Z",
            id: "app-001-cv-v1",
            source: "generation",
            templateId: "template-cv-ats",
            versionNumber: 1,
          },
        ]}
      />,
    );

    expect(markup).toContain("Historique des versions CV");
    expect(markup).toContain("Version 1");
    expect(markup).toContain("génération");
  });

  it("renders editable fields and live preview with candidate data", () => {
    const markup = renderToStaticMarkup(
      <CvEditor applicationId="app-001" cvContent={sampleCvContent} />,
    );

    expect(markup).toContain("En-tête");
    expect(markup).toContain("Compétences techniques");
    expect(markup).toContain("Aperçu PDF");
    expect(markup).toContain("Alice");
    expect(markup).toContain("TypeScript");
    expect(markup).toContain('data-document-preview="pdf"');
  });

  it("does not render legacy editor desktop/mobile sections", () => {
    const markup = renderToStaticMarkup(
      <CvEditor applicationId="app-001" cvContent={sampleCvContent} />,
    );

    expect(markup).not.toContain("legacy-render");
    expect(markup).not.toContain("legacy-editor-loader");
    expect(markup).not.toContain("cvforge-cv-editor__desktop-only");
  });
});
