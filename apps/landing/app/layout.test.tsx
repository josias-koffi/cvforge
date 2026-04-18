import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("Landing RootLayout", () => {
  it("should render the french html shell when children are provided", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>landing child</div>
      </RootLayout>,
    );

    expect(markup).toContain('lang="fr"');
    expect(markup).toContain("landing child");
  });
});
