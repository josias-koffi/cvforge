import { describe, expect, it } from "vitest";
import { resolveFranceTravailConfig } from "./france-travail.config";

describe("resolveFranceTravailConfig", () => {
  it("reads the credentials and enables the source", () => {
    const config = resolveFranceTravailConfig({
      FRANCE_TRAVAIL_CLIENT_ID: " id ",
      FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
    });

    expect(config).toMatchObject({
      clientId: "id",
      clientSecret: "secret",
      enabled: true,
      requestsPerSecond: 4,
    });
  });

  it("stays disabled when a credential is missing", () => {
    expect(resolveFranceTravailConfig({}).enabled).toBe(false);
    expect(
      resolveFranceTravailConfig({ FRANCE_TRAVAIL_CLIENT_ID: "id" }).enabled,
    ).toBe(false);
  });

  it("accepts a configured pace", () => {
    expect(
      resolveFranceTravailConfig({
        FRANCE_TRAVAIL_CLIENT_ID: "id",
        FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
        FRANCE_TRAVAIL_REQUESTS_PER_SECOND: "10",
      }).requestsPerSecond,
    ).toBe(10);
  });

  it("falls back on the documented quota, never on an unbounded pace", () => {
    for (const value of ["0", "-2", "beaucoup", ""]) {
      expect(
        resolveFranceTravailConfig({
          FRANCE_TRAVAIL_CLIENT_ID: "id",
          FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
          FRANCE_TRAVAIL_REQUESTS_PER_SECOND: value,
        }).requestsPerSecond,
      ).toBe(4);
    }
  });
});
