import { describe, expect, it } from "vitest";
import { resolveAuthConfig } from "./auth.config";

describe("resolveAuthConfig", () => {
  it("should provide secure defaults for local development", () => {
    const config = resolveAuthConfig({});

    expect(config.apiUrl).toBe("http://localhost:3333");
    expect(config.appUrl).toBe("http://localhost:3000");
    expect(config.magicLinkTtlMinutes).toBe(15);
    expect(config.sessionTtlDays).toBe(7);
    expect(config.cookieName).toBe("cvforge_session");
    expect(config.secureCookies).toBe(false);
  });

  it("should require an explicit session secret in production", () => {
    expect(() =>
      resolveAuthConfig({
        NODE_ENV: "production",
      }),
    ).toThrow(/AUTH_SESSION_SECRET/);
  });
});
