import { describe, expect, it } from "vitest";
import { buildJobSources } from "./job-sources.factory";

describe("buildJobSources", () => {
  it("builds nothing without credentials", () => {
    // Adding a source then skipping it would make the digest report "two
    // sources" and mean one.
    expect(buildJobSources({})).toEqual([]);
  });

  it("builds each source its own credentials allow", () => {
    expect(
      buildJobSources({
        FRANCE_TRAVAIL_CLIENT_ID: "id",
        FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
      }).map((source) => source.source),
    ).toEqual(["france_travail"]);

    expect(
      buildJobSources({ LA_BONNE_ALTERNANCE_API_KEY: "key" }).map(
        (source) => source.source,
      ),
    ).toEqual(["la_bonne_alternance"]);
  });

  it("builds both when both are configured", () => {
    expect(
      buildJobSources({
        FRANCE_TRAVAIL_CLIENT_ID: "id",
        FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
        LA_BONNE_ALTERNANCE_API_KEY: "key",
      }).map((source) => source.source),
    ).toEqual(["france_travail", "la_bonne_alternance"]);
  });
});
