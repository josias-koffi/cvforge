import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("should render the french html shell when children are provided", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>child content</div>
      </RootLayout>,
    );

    expect(markup).toContain('lang="fr"');
    expect(markup).toContain("<body");
    expect(markup).toContain("background-color:#FAFAF7");
    expect(markup).toContain("child content");
  });
});
