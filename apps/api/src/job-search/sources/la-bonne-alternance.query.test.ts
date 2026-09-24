import { describe, expect, it } from "vitest";
import type { JobSourceQuery } from "../job-search.types";
import {
  cacheKeyFor,
  toLaBonneAlternanceParams,
} from "./la-bonne-alternance.query";

function makeQuery(overrides: Partial<JobSourceQuery> = {}): JobSourceQuery {
  return {
    contractTypes: ["alternance"],
    department: "44",
    experienceLevel: null,
    keywords: "Comptable",
    romeCodes: [],
    nafDivisions: [],
    publishedSinceDays: 1,
    ...overrides,
  };
}

describe("toLaBonneAlternanceParams", () => {
  it("passes the department, and nothing else", () => {
    // The API has no keyword parameter: passing one would be ignored, and
    // pretending otherwise in the code would mislead the next reader.
    expect(toLaBonneAlternanceParams(makeQuery())).toEqual({
      departements: "44",
    });
  });

  it("searches the whole of France when no department is set", () => {
    expect(toLaBonneAlternanceParams(makeQuery({ department: "" }))).toEqual({});
  });

  it("refuses a query nobody wants an alternance for", () => {
    // Everything here is an apprenticeship: calling for a CDI search would
    // spend quota to bring back offers no candidate asked for.
    expect(toLaBonneAlternanceParams(makeQuery({ contractTypes: ["cdi"] }))).toBeNull();
  });

  it("accepts a query where only one candidate asked for it", () => {
    expect(
      toLaBonneAlternanceParams(makeQuery({ contractTypes: ["cdi", "alternance"] })),
    ).toEqual({ departements: "44" });
  });
});

describe("cacheKeyFor", () => {
  it("gives one key per department", () => {
    expect(cacheKeyFor({ departements: "44" })).toBe("44");
    expect(cacheKeyFor({})).toBe("france");
  });
});

describe("La bonne alternance by ROME job (US-124)", () => {
  it("passes the job as `romes`, next to the department", () => {
    expect(
      toLaBonneAlternanceParams(makeQuery({ keywords: "", romeCodes: ["D1102"] })),
    ).toEqual({ departements: "44", romes: "D1102" });
    expect(
      toLaBonneAlternanceParams(
        makeQuery({ department: "", keywords: "", romeCodes: ["D1102"] }),
      ),
    ).toEqual({ romes: "D1102" });
  });

  it("never answers a job's query from its department's page", () => {
    expect(cacheKeyFor({ departements: "44", romes: "D1102" })).toBe("44|D1102");
    expect(cacheKeyFor({ romes: "D1102" })).toBe("france|D1102");
    expect(cacheKeyFor({ departements: "44", romes: "D1102" })).not.toBe(
      cacheKeyFor({ departements: "44" }),
    );
  });
});

