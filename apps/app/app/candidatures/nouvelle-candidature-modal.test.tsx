import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NouvelleCondidatureModal } from "./nouvelle-candidature-modal";

describe("NouvelleCondidatureModal", () => {
  it("renders nothing when closed", () => {
    const markup = renderToStaticMarkup(
      <NouvelleCondidatureModal onClose={() => {}} open={false} />,
    );
    expect(markup).toBe("");
  });

  it("renders with role=dialog when open", () => {
    const markup = renderToStaticMarkup(
      <NouvelleCondidatureModal onClose={() => {}} open />,
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-label="Nouvelle candidature"');
  });

  it("renders URL import form when open", () => {
    const markup = renderToStaticMarkup(
      <NouvelleCondidatureModal onClose={() => {}} open />,
    );
    expect(markup).toContain("URL de l");
    expect(markup).toContain("action=\"/candidatures/import\"");
  });

  it("renders text fallback form when open", () => {
    const markup = renderToStaticMarkup(
      <NouvelleCondidatureModal onClose={() => {}} open />,
    );
    expect(markup).toContain("Fallback texte");
    expect(markup).toContain("Texte de l");
  });

  it("renders close button with aria-label", () => {
    const markup = renderToStaticMarkup(
      <NouvelleCondidatureModal onClose={() => {}} open />,
    );
    expect(markup).toContain('aria-label="Fermer"');
  });

  it("prefills URL input with submittedUrl", () => {
    const markup = renderToStaticMarkup(
      <NouvelleCondidatureModal
        onClose={() => {}}
        open
        submittedUrl="https://example.com/job"
      />,
    );
    expect(markup).toContain("https://example.com/job");
  });
});
