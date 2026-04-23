import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@puckeditor/core", () => ({
  Render: ({
    data,
  }: {
    data: {
      content: Array<{ type: string; props: Record<string, unknown> }>;
    };
  }) =>
    React.createElement(
      "div",
      { "data-testid": "puck-render" },
      data.content
        .filter((item) => item.type === "CVHeader")
        .map((item, i) =>
          React.createElement("span", { key: i }, String(item.props.firstName)),
        ),
    ),
}));

vi.mock("./puck-cv-editor-loader", () => ({
  PuckCvEditorLoader: () =>
    React.createElement("div", { "data-testid": "puck-editor-loader" }),
}));

import { CvEditor } from "./cv-editor";
import type { PuckData } from "@cvforge/types";

const samplePuckData: PuckData = {
  content: [
    {
      type: "CVHeader",
      props: {
        id: "cv-header",
        firstName: "Alice",
        lastName: "Martin",
        city: "Paris",
        email: "alice@example.com",
        github: "",
        linkedin: "",
        phone: "+33600000000",
        title: "Engineer",
      },
    },
  ],
  root: { props: {} },
};

describe("CvEditor", () => {
  it("renders the section header with title, badge and PDF button", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CvEditor, {
        applicationId: "app-001",
        puckData: samplePuckData,
      }),
    );

    expect(markup).toContain("Edition du CV par contenu");
    expect(markup).toContain("Lecture seule sur mobile");
    expect(markup).toContain("Télécharger le PDF");
    expect(markup).toContain("Télécharger le DOCX");
  });

  it("renders CV version history when versions are provided", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CvEditor, {
        applicationId: "app-001",
        puckData: samplePuckData,
        versions: [
          {
            content: {} as never,
            createdAt: "2026-04-23T10:00:00.000Z",
            id: "app-001-cv-v1",
            source: "generation",
            templateId: "template-cv-ats",
            versionNumber: 1,
          },
        ],
      }),
    );

    expect(markup).toContain("Historique des versions CV");
    expect(markup).toContain("Version 1");
    expect(markup).toContain("génération");
  });

  it("renders the mobile Puck Render component with candidate data", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CvEditor, {
        applicationId: "app-001",
        puckData: samplePuckData,
      }),
    );

    expect(markup).toContain("puck-render");
    expect(markup).toContain("Alice");
  });

  it("renders the desktop Puck editor loader in the desktop-only section", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CvEditor, {
        applicationId: "app-001",
        puckData: samplePuckData,
      }),
    );

    expect(markup).toContain("puck-editor-loader");
    expect(markup).toContain("cvforge-cv-editor__desktop-only");
  });

  it("renders mobile and desktop sections with correct CSS classes", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CvEditor, {
        applicationId: "app-001",
        puckData: samplePuckData,
      }),
    );

    expect(markup).toContain("cvforge-cv-editor__mobile-only");
    expect(markup).toContain("cvforge-cv-editor__desktop-only");
  });

  it("includes explanatory copy about desktop editing and Publish action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CvEditor, {
        applicationId: "app-001",
        puckData: samplePuckData,
      }),
    );

    expect(markup).toContain("lecture seule");
    expect(markup).toContain("Publier");
  });
});
