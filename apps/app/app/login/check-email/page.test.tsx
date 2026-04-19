import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CheckEmailPage from "./page";

describe("CheckEmailPage", () => {
  it("should render the generated magic link information", async () => {
    const Page = await CheckEmailPage({
      searchParams: Promise.resolve({
        email: "user@example.com",
        expiresAt: "2026-04-19T20:34:09.000Z",
        sessionDurationDays: "7",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("Verifiez votre boite mail");
    expect(markup).toContain("user@example.com");
    expect(markup).toContain("7 jours");
    expect(markup).toContain("spams");
  });

  it("should render the page even when only the email is known", async () => {
    const Page = await CheckEmailPage({
      searchParams: Promise.resolve({
        email: "user@example.com",
      }),
    });
    const markup = renderToStaticMarkup(Page);

    expect(markup).toContain("user@example.com");
  });
});
