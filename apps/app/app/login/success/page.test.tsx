import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LoginSuccessPage from "./page";

describe("LoginSuccessPage", () => {
  it("should render the session validation shell", () => {
    const markup = renderToStaticMarkup(<LoginSuccessPage />);

    expect(markup).toContain("Session ouverte");
    expect(markup).toContain("Validation de la session");
  });
});
