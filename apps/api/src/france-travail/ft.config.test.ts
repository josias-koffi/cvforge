import { describe, expect, it } from "vitest";
import { FT_API_IDS, FT_APIS, isFtApiId, resolveFtConfig } from "./ft.config";

const CREDENTIALS = {
  FRANCE_TRAVAIL_CLIENT_ID: " id ",
  FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
};

describe("FT_APIS", () => {
  it("gives every API its own scope and a read call for the smoke test", () => {
    for (const id of FT_API_IDS) {
      expect(FT_APIS[id].scope).not.toBe("");
      expect(FT_APIS[id].smoke.path.startsWith("/")).toBe(true);
    }

    expect(new Set(FT_API_IDS.map((id) => FT_APIS[id].scope)).size).toBe(
      FT_API_IDS.length,
    );
  });

  it("calls La Bonne Boîte and ROME Substitutions on the paths the support gave", () => {
    expect(FT_APIS["la-bonne-boite"].smoke.path).toBe("/recherche");
    expect(FT_APIS["rome-substitutions"].smoke.path).toBe(
      "/substitution/COMPETENCE/500015",
    );
  });

  it("sends ROMEO the caller name it requires", () => {
    expect(FT_APIS.romeo.smoke.body).toMatchObject({
      options: { nomAppelant: "cvforge" },
    });
  });
});

describe("resolveFtConfig", () => {
  it("enables only Offres d'emploi by default, as before this layer", () => {
    const config = resolveFtConfig(CREDENTIALS);

    expect(config.clientId).toBe("id");
    expect(config.hasCredentials).toBe(true);
    expect(FT_API_IDS.filter((id) => config.apis[id].enabled)).toEqual([
      "offres",
    ]);
    expect(config.apis.offres.requestsPerSecond).toBe(4);
  });

  it("enables what FRANCE_TRAVAIL_APIS lists, and reports what it cannot read", () => {
    const config = resolveFtConfig({
      ...CREDENTIALS,
      FRANCE_TRAVAIL_APIS: " Romeo, rome-metiers ,romeoo,,",
    });

    expect(FT_API_IDS.filter((id) => config.apis[id].enabled)).toEqual([
      "romeo",
      "rome-metiers",
    ]);
    expect(config.unknownApis).toEqual(["romeoo"]);
  });

  it("keeps every API inert without credentials", () => {
    const config = resolveFtConfig({
      FRANCE_TRAVAIL_APIS: "offres,romeo",
      FRANCE_TRAVAIL_CLIENT_ID: "id",
    });

    expect(config.hasCredentials).toBe(false);
    expect(FT_API_IDS.some((id) => config.apis[id].enabled)).toBe(false);
  });

  it("overrides a scope and a pace per API", () => {
    const config = resolveFtConfig({
      ...CREDENTIALS,
      FRANCE_TRAVAIL_ROME_METIERS_REQUESTS_PER_SECOND: "3",
      FRANCE_TRAVAIL_ROME_METIERS_SCOPE: " api_rome-metiersv1 ",
    });

    expect(config.apis["rome-metiers"]).toMatchObject({
      requestsPerSecond: 3,
      scope: "api_rome-metiersv1",
    });
    expect(config.apis.romeo.scope).toBe(FT_APIS.romeo.scope);
  });

  it("still reads the historical pace variable for Offres d'emploi", () => {
    expect(
      resolveFtConfig({
        ...CREDENTIALS,
        FRANCE_TRAVAIL_REQUESTS_PER_SECOND: "10",
      }).apis.offres.requestsPerSecond,
    ).toBe(10);
  });

  it("falls back on the catalogue pace, never on an unbounded one", () => {
    for (const value of ["0", "-2", "beaucoup", "", " "]) {
      expect(
        resolveFtConfig({
          ...CREDENTIALS,
          FRANCE_TRAVAIL_OFFRES_REQUESTS_PER_SECOND: value,
        }).apis.offres.requestsPerSecond,
      ).toBe(4);
    }
  });
});

describe("isFtApiId", () => {
  it("accepts catalogue ids only", () => {
    expect(isFtApiId("romeo")).toBe(true);
    expect(isFtApiId("ROMEO")).toBe(false);
    expect(isFtApiId("marche-travail")).toBe(false);
  });
});
