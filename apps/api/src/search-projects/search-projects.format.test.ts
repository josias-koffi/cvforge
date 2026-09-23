import { emptySearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { formatContractSearch } from "./search-projects.format";

function makeProject(overrides: Parameters<typeof Object.assign>[1] = {}) {
  return { ...emptySearchProject("profile-1"), ...overrides };
}

describe("formatContractSearch", () => {
  it("says nothing when no contract is selected", () => {
    expect(formatContractSearch(makeProject())).toBe("");
  });

  it("names a single contract", () => {
    expect(formatContractSearch(makeProject({ contractTypes: ["cdi"] }))).toBe(
      "CDI",
    );
  });

  it("joins a stage and alternance pair, with the rhythm and the start month", () => {
    const project = makeProject({
      apprenticeship: {
        contractKind: "apprentissage",
        diploma: "Master",
        durationMonths: 24,
        rhythm: "3j/2j",
        schoolName: "",
        startDate: "2026-09-01",
      },
      contractTypes: ["stage", "alternance"],
    });

    expect(formatContractSearch(project)).toBe(
      "Stage ou alternance (rythme 3j/2j) à partir de septembre 2026",
    );
  });

  it("falls back on the internship start date", () => {
    const project = makeProject({
      contractTypes: ["stage"],
      internship: { durationMonths: 6, schoolLevel: "", startDate: "2027-01-04" },
    });

    expect(formatContractSearch(project)).toBe("Stage à partir de janvier 2027");
  });

  it("lists three contracts readably", () => {
    const project = makeProject({ contractTypes: ["cdi", "cdd", "freelance"] });

    expect(formatContractSearch(project)).toBe("CDI, CDD ou freelance");
  });
});
