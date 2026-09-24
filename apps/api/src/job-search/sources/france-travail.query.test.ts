import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  buildSourceQueries as buildQueries,
  toFranceTravailParams,
} from "./france-travail.query";

/** The searches as they were before US-124: no confirmed ROME job. */
function buildSourceQueries(projects: SearchProject[], sinceDays: number) {
  return buildQueries(
    projects.map((project) => ({ project, romeCodes: [] })),
    sinceDays,
  );
}

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
      experience: "2,4",
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

  it("drops the sector filter rather than losing the query", () => {
    // Two sectors are already five NAF divisions: the API answers 400 and the
    // whole page is lost, so a wider collection beats a query that brings
    // nothing back.
    const [narrow] = buildSourceQueries(
      [makeProject({ sectors: ["numerique"] })],
      1,
    );
    const [wide] = buildSourceQueries(
      [makeProject({ sectors: ["numerique", "sante_social"] })],
      1,
    );

    expect(toFranceTravailParams(narrow!, "0-149").secteurActivite).toBe("62,63");
    expect(toFranceTravailParams(wide!, "0-149").secteurActivite).toBeUndefined();
  });

  it("rounds the publication window up to a value the API accepts", () => {
    // 1, 3, 7, 14 or 31 — anything else is a 400, so 30 days asks for 31.
    const [query] = buildSourceQueries([makeProject()], 30);

    expect(toFranceTravailParams(query!, "0-149").publieeDepuis).toBe("31");
    expect(
      toFranceTravailParams(buildSourceQueries([makeProject()], 2)[0]!, "0-149")
        .publieeDepuis,
    ).toBe("3");
    expect(
      toFranceTravailParams(buildSourceQueries([makeProject()], 90)[0]!, "0-149")
        .publieeDepuis,
    ).toBe("31");
  });

  it("sends a beginner to the offers that take beginners", () => {
    // Code 1 means "under a year of experience *required*" — the opposite of
    // what a beginner needs. Beginners welcome is code 4.
    const [query] = buildSourceQueries(
      [makeProject({ experienceLevel: "debutant" })],
      1,
    );

    expect(toFranceTravailParams(query!, "0-149").experience).toBe("4");
  });

  it("does not narrow the contract for an internship, which has no code", () => {
    const [query] = buildSourceQueries(
      [makeProject({ contractTypes: ["stage"] })],
      1,
    );
    const params = toFranceTravailParams(query!, "0-149");

    // France Travail publishes internships as a CDI, a CDD or an interim
    // mission alike; filtering on any of them would lose most of them.
    expect(params.typeContrat).toBeUndefined();
    expect(params.natureContrat).toBeUndefined();
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

describe("buildSourceQueries with confirmed ROME jobs (US-124)", () => {
  it("adds one query per ROME job and department, next to the keyword ones", () => {
    const queries = buildQueries(
      [{ project: makeProject(), romeCodes: ["M1855", "M1805", "M1855"] }],
      1,
    );

    expect(queries.map((query) => [query.keywords, query.romeCodes])).toEqual([
      ["Développeur Full Stack", []],
      ["", ["M1855"]],
      ["", ["M1805"]],
    ]);
    expect(queries.every((query) => query.department === "44")).toBe(true);
  });

  it("shares a ROME query between candidates, with the union of their filters", () => {
    const queries = buildQueries(
      [
        {
          project: makeProject({ targetRoles: [] }),
          romeCodes: ["D1102"],
        },
        {
          project: makeProject({
            contractTypes: ["alternance"],
            targetRoles: [],
          }),
          romeCodes: ["D1102"],
        },
      ],
      1,
    );

    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({
      contractTypes: ["cdi", "alternance"],
      keywords: "",
      romeCodes: ["D1102"],
    });
  });

  it("keeps a project without confirmed jobs on keywords alone", () => {
    expect(
      buildQueries([{ project: makeProject(), romeCodes: [] }], 1).map(
        (query) => query.romeCodes,
      ),
    ).toEqual([[]]);
  });

  it("asks France Travail by codeROME, without motsCles", () => {
    const [, byRome] = buildQueries(
      [{ project: makeProject(), romeCodes: ["M1855"] }],
      1,
    );

    const params = toFranceTravailParams(byRome!, "0-149");
    expect(params.codeROME).toBe("M1855");
    expect(params.motsCles).toBeUndefined();
    expect(params.departement).toBe("44");
  });
});

