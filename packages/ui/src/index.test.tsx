import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppShell } from "./index";

describe("AppShell", () => {
  it("should render the provided title and description", () => {
    const markup = renderToStaticMarkup(
      <AppShell title="Paper Shell" description="Rendered for coverage." />,
    );

    expect(markup).toContain("Paper Shell");
    expect(markup).toContain("Rendered for coverage.");
    expect(markup).toContain("CVforge");
    expect(markup).toContain("linear-gradient");
  });
});
