import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GlobalErrorPage from "./global-error";

describe("GlobalErrorPage", () => {
  it("renders the critical error shell and reload action", () => {
    const markup = renderToStaticMarkup(
      <GlobalErrorPage
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );

    expect(markup).toContain("Erreur critique");
    expect(markup).toContain("Une erreur critique a interrompu le chargement de l&#x27;application");
    expect(markup).toContain("Recharger");
    expect(markup).toContain("lang=\"fr\"");
  });
});
