import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EducationFields } from "./profile-entry-fields";

describe("EducationFields", () => {
  it("renders the editable education description field", () => {
    const markup = renderToStaticMarkup(
      <EducationFields
        education={{
          degree: "Master IA",
          description: "Projets de NLP et systemes distribues.",
          honors: "Bien",
          institution: "Sorbonne",
          year: "2025",
        }}
        index={0}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(markup).toContain("Description de la formation");
    expect(markup).toContain("education-description-0");
    expect(markup).toContain("Projets de NLP et systemes distribues.");
  });
});
