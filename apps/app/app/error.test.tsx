import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("renders the retry message and action", () => {
    const markup = renderToStaticMarkup(
      <ErrorPage
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );

    expect(markup).toContain("Une erreur est survenue");
    expect(markup).toContain("CVforge n&#x27;a pas pu afficher cette page correctement");
    expect(markup).toContain("Reessayer");
  });
});
