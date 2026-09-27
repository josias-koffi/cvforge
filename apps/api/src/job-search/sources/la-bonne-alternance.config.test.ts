import { describe, expect, it } from "vitest";
import { resolveLaBonneAlternanceConfig } from "./la-bonne-alternance.config";

describe("resolveLaBonneAlternanceConfig", () => {
  it("stays disabled without a key, rather than failing the boot", () => {
    expect(resolveLaBonneAlternanceConfig({})).toMatchObject({
      apiKey: "",
      enabled: false,
    });
    expect(
      resolveLaBonneAlternanceConfig({ LA_BONNE_ALTERNANCE_API_KEY: "  " })
        .enabled,
    ).toBe(false);
  });

  it("enables the source as soon as a key is set", () => {
    expect(
      resolveLaBonneAlternanceConfig({ LA_BONNE_ALTERNANCE_API_KEY: " k " }),
    ).toMatchObject({ apiKey: "k", enabled: true });
  });

  it("defaults to one call a second — the API documents 60 a minute", () => {
    expect(resolveLaBonneAlternanceConfig({}).requestsPerSecond).toBe(1);
  });

  it("ignores a rate that makes no sense", () => {
    for (const value of ["0", "-3", "beaucoup", ""]) {
      expect(
        resolveLaBonneAlternanceConfig({
          LA_BONNE_ALTERNANCE_REQUESTS_PER_SECOND: value,
        }).requestsPerSecond,
      ).toBe(1);
    }
  });

  it("honours a rate that does", () => {
    expect(
      resolveLaBonneAlternanceConfig({
        LA_BONNE_ALTERNANCE_REQUESTS_PER_SECOND: "0.5",
      }).requestsPerSecond,
    ).toBe(0.5);
  });
});
