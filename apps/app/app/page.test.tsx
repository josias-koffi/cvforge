import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("should render the application shell content", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("CVforge App");
    expect(markup).toContain("PWA candidat initialis");
    expect(markup).toContain("Tableau de bord");
    expect(markup).toContain("Sections principales");
  });
});
