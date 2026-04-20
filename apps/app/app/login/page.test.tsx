import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("should render the passwordless login form", async () => {
    const Page = await LoginPage({});
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Connexion passwordless");
    expect(markup).toContain('action="/login/request"');
    expect(markup).toContain('type="email"');
    expect(markup).toContain('name="consentAccepted"');
    expect(markup).toContain("Recevoir mon magic link");
  });

  it("should render the API failure message when requested", async () => {
    const Page = await LoginPage({
      searchParams: Promise.resolve({
        error: "request_failed",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Impossible de generer le magic link");
  });

  it("should render the consent error message when requested", async () => {
    const Page = await LoginPage({
      searchParams: Promise.resolve({
        error: "consent_required",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Le consentement RGPD est requis");
  });
});
