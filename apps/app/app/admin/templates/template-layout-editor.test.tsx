import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateLayoutEditor } from "./template-layout-editor";
import type { TemplateLayoutData } from "@cvforge/types";

const sampleData: TemplateLayoutData = {
  content: [
    {
      props: {
        id: "cv-header",
        city: "Paris",
        email: "alice@example.com",
        firstName: "Alice",
        github: "",
        lastName: "Martin",
        linkedin: "",
        phone: "+33600000000",
        title: "Engineer",
      },
      type: "CVHeader",
    },
    {
      props: {
        achievements: ["Reduced latency"],
        company: "CVforge",
        description: "Built template tools",
        endDate: "2026",
        id: "experience",
        position: "Engineer",
        startDate: "2024",
      },
      type: "ExperienceItem",
    },
  ],
  root: { props: {} },
};

describe("TemplateLayoutEditor", () => {
  it("renders custom block controls", () => {
    const markup = renderToStaticMarkup(
      <TemplateLayoutEditor
        initialData={sampleData}
        kind="cv"
        templateId="template-cv-ats"
      />,
    );

    expect(markup).toContain("Blocs disponibles");
    expect(markup).toContain("Ajouter CV Header");
    expect(markup).toContain("CV Header");
    expect(markup).toContain("Experience");
    expect(markup).toContain("Monter");
    expect(markup).toContain("Retirer");
    expect(markup).toContain("Publier le layout");
  });

  it("limits available blocks to letter templates", () => {
    const markup = renderToStaticMarkup(
      <TemplateLayoutEditor
        initialData={{ content: [], root: { props: {} } }}
        kind="letter"
        templateId="template-letter-ats"
      />,
    );

    expect(markup).toContain("Ajouter Letter Header");
    expect(markup).toContain("Ajouter Letter Body");
    expect(markup).not.toContain("Ajouter CV Header");
  });
});
