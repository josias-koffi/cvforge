import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  buildSourceQueries,
  toFranceTravailParams,
} from "./france-travail.query";

function makeProject(overrides: Partial<SearchProject> = {}): SearchProject {
  return {
    ...emptySearchProject("profile-1"),
    contractTypes: ["cdi"],
    locations: [
      {
        department: "44",
        inseeCode: "44109",
        label: "Nantes",
        latitude: 47.21,
        longitude: -1.55,
        radiusKm: 30,
      },
    ],
    targetRoles: ["Développeur Full Stack"],
    ...overrides,
  };
}

describe("buildSourceQueries", () => {
  it("makes one query per role and department", () => {
    const project = makeProject({
      locations: [
        { ...makeProject().locations[0]!, department: "44" },
        {
          department: "75",
          inseeCode: "75056",
          label: "Paris",
          latitude: null,
          longitude: null,
          radiusKm: 20,
        },
      ],
      targetRoles: ["Développeur Full Stack", "Développeur Back-end"],
    });

    expect(buildSourceQueries([project], 1)).toHaveLength(4);
  });

  it("shares one query between two candidates asking the same thing", () => {
    const queries = buildSourceQueries(
      [
        makeProject(),
        makeProject({
          contractTypes: ["cdd"],
          targetRoles: ["développeur full stack"],
        }),
      ],
      1,
    );

    expect(queries).toHaveLength(1);
    // The shared call has to cover both, or one of them gets nothing.
    expect(queries[0]?.contractTypes).toEqual(["cdi", "cdd"]);
  });

  it("drops the experience filter when the candidates disagree", () => {
    const queries = buildSourceQueries(
      [
        makeProject({ experienceLevel: "junior" }),
        makeProject({ experienceLevel: "senior" }),
      ],
      1,
    );

    expect(queries[0]?.experienceLevel).toBeNull();
  });

  it("widens to every sector as soon as one candidate wants no filter", () => {
    const queries = buildSourceQueries(
      [makeProject({ sectors: ["numerique"] }), makeProject({ sectors: [] })],
      1,
    );

    expect(queries[0]?.nafDivisions).toEqual([]);
  });

  it("searches all of France for a candidate who is mobile or fully remote", () => {
    expect(
      buildSourceQueries([makeProject({ nationalMobility: true })], 1)[0]
        ?.department,
    ).toBe("");
    expect(
      buildSourceQueries([makeProject({ remote: "full_remote" })], 1)[0]
        ?.department,
    ).toBe("");
  });

  it("ignores a project with no role to search for", () => {
    expect(buildSourceQueries([makeProject({ targetRoles: ["  "] })], 1)).toEqual(
      [],
    );
  });
});

describe("toFranceTravailParams", () => {
  it("translates contracts, sectors and experience", () => {
    const [query] = buildSourceQueries(
      [
        makeProject({
          contractTypes: ["cdi", "freelance"],
          experienceLevel: "junior",
          sectors: ["numerique"],
        }),
      ],
      1,
    );

    expect(toFranceTravailParams(query!, "0-149")).toEqual({
      departement: "44",
      experience: "2",
      motsCles: "Développeur Full Stack",
      publieeDepuis: "1",
      range: "0-149",
      secteurActivite: "62,63",
      typeContrat: "CDI,LIB",
    });
  });

  it("asks for the two alternance natures, not just a contract type", () => {
    const [query] = buildSourceQueries(
      [makeProject({ contractTypes: ["stage", "alternance"] })],
      1,
    );
    const params = toFranceTravailParams(query!, "0-149");

    expect(params.natureContrat).toBe("E2,FS");
    // Neither stage nor alternance maps to a typeContrat code, so sending one
    // would wrongly narrow the search.
    expect(params.typeContrat).toBeUndefined();
  });

  it("leaves the filters out when the candidate is open to anything", () => {
    const [query] = buildSourceQueries(
      [makeProject({ contractTypes: [], nationalMobility: true })],
      1,
    );

    expect(toFranceTravailParams(query!, "0-149")).toEqual({
      motsCles: "Développeur Full Stack",
      publieeDepuis: "1",
      range: "0-149",
    });
  });
});
