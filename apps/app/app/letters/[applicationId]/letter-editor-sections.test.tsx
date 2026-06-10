import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LetterRegenerationPanel,
  LetterVersionHistory,
} from "./letter-editor-sections";

describe("letter editor sections", () => {
  it("renders the empty version history state", () => {
    const markup = renderToStaticMarkup(<LetterVersionHistory versions={[]} />);

    expect(markup).toContain("Historique des versions LM (0)");
    expect(markup).toContain("Aucune version historisée");
  });

  it("renders regeneration progress and error feedback", () => {
    const markup = renderToStaticMarkup(
      <LetterRegenerationPanel
        message="La régénération a échoué."
        onRefinementChange={vi.fn()}
        onRegenerate={vi.fn()}
        refinement="Insister sur TypeScript"
        status="error"
      />,
    );

    expect(markup).toContain("23 / 500");
    expect(markup).toContain("La régénération a échoué");
    expect(markup).toContain("#FBEAE7");
  });
});
