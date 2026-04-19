import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";

describe("LandingPage", () => {
  it("should render the marketing shell content", () => {
    const markup = renderToStaticMarkup(<LandingPage />);

    expect(markup).toContain("CVforge Landing");
    expect(markup).toContain("Site vitrine initialis");
    expect(markup).toContain("Templates");
    expect(markup).toContain("Navigation principale");
  });
});
