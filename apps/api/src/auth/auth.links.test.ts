import { describe, expect, it } from "vitest";
import { buildMagicLink, normalizeRedirectTarget } from "./auth.links";

const config = { apiUrl: "http://api.local", appUrl: "http://app.local" };

describe("buildMagicLink", () => {
  it("is redeemed by the API, then opens the app's login success", () => {
    const link = new URL(buildMagicLink(config, "token"));

    expect(link.origin + link.pathname).toBe(
      "http://api.local/auth/passwordless/consume",
    );
    expect(link.searchParams.get("redirectTo")).toBe(
      "http://app.local/login/success",
    );
  });
});

describe("normalizeRedirectTarget", () => {
  it("defaults to the login success page", () => {
    expect(normalizeRedirectTarget(config)).toBe(
      "http://app.local/login/success",
    );
  });

  it("keeps a target on the app's origin, query included", () => {
    expect(
      normalizeRedirectTarget(config, "http://app.local/login/success?next=/x"),
    ).toBe("http://app.local/login/success?next=/x");
  });

  it.each([
    ["another origin", "https://evil.example/login/success"],
    ["an unparsable target", "http://[bad"],
  ])("sends %s to the login page", (_label, target) => {
    expect(normalizeRedirectTarget(config, target)).toBe(
      "http://app.local/login",
    );
  });
});
