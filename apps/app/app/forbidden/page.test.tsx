import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ForbiddenPage from "./page";

describe("ForbiddenPage", () => {
  it("should render the access denied guidance", () => {
    const markup = renderToStaticMarkup(<ForbiddenPage />);

    expect(markup).toContain("Acces refuse");
    expect(markup).toContain("reservee aux administrateurs");
    expect(markup).toContain('href="/"');
  });
});
