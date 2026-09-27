import { describe, expect, it } from "vitest";
import {
  normalizeSearchProject,
  parseLegacyContractTypes,
} from "./search-projects.normalize";

describe("normalizeSearchProject", () => {
  it("reads a filled-in project", () => {
    const project = normalizeSearchProject("profile-1", {
      aiRerankEnabled: true,
      companySizes: ["pme", "ge"],
      companyValues: ["egapro_75plus"],
      contractTypes: ["stage", "alternance"],
      digestEnabled: true,
      experienceLevel: "junior",
      internship: { durationMonths: 6, schoolLevel: "bac+5", startDate: "2027-01-04" },
      apprenticeship: {
        contractKind: "apprentissage",
        diploma: "Master",
        durationMonths: 24,
        rhythm: "3j/2j",
        schoolName: "Epitech",
        startDate: "2027-09-01",
      },
      locations: [
        { inseeCode: "75056", label: "Paris", radiusKm: 30 },
        { inseeCode: "2A004", label: "Ajaccio" },
      ],
      remote: "hybrid",
      salaryMinYearly: 42000,
      sectors: ["numerique"],
      targetRoles: ["Développeur Full Stack", "  "],
    });

    expect(project).toMatchObject({
      aiRerankEnabled: true,
      contractTypes: ["stage", "alternance"],
      experienceLevel: "junior",
      profileId: "profile-1",
      remote: "hybrid",
      salaryMinYearly: 42000,
      sectors: ["numerique"],
      targetRoles: ["Développeur Full Stack"],
    });
    expect(project.apprenticeship?.rhythm).toBe("3j/2j");
    expect(project.internship?.durationMonths).toBe(6);
    // Paris is department 75; Corsica keeps its letter.
    expect(project.locations.map((entry) => entry.department)).toEqual(["75", "2A"]);
    expect(project.locations[1]?.radiusKm).toBe(25);
  });

  it("drops values the enums do not know instead of storing them", () => {
    const project = normalizeSearchProject("profile-1", {
      companyValues: ["greenwashing"],
      contractTypes: ["cdi", "portage-salarial"],
      experienceLevel: "expert",
      remote: "moon",
      sectors: ["numerique", "crypto"],
    });

    expect(project.contractTypes).toEqual(["cdi"]);
    expect(project.sectors).toEqual(["numerique"]);
    expect(project.companyValues).toEqual([]);
    expect(project.experienceLevel).toBeNull();
    expect(project.remote).toBe("any");
  });

  it("keeps the internship and apprenticeship blocks only when asked for", () => {
    const project = normalizeSearchProject("profile-1", {
      apprenticeship: { rhythm: "3j/2j" },
      contractTypes: ["cdi"],
      internship: { durationMonths: 6 },
    });

    expect(project.internship).toBeNull();
    expect(project.apprenticeship).toBeNull();
  });

  it("bounds the lists and refuses out-of-range numbers", () => {
    const project = normalizeSearchProject("profile-1", {
      locations: Array.from({ length: 40 }, (_, index) => ({
        inseeCode: `7505${index}`,
        label: `Ville ${index}`,
        latitude: 999,
        radiusKm: 5000,
      })),
      salaryMinYearly: -10,
      targetRoles: Array.from({ length: 40 }, (_, index) => `Poste ${index}`),
    });

    expect(project.targetRoles).toHaveLength(10);
    expect(project.locations).toHaveLength(10);
    expect(project.locations[0]?.radiusKm).toBe(200);
    expect(project.locations[0]?.latitude).toBeNull();
    expect(project.salaryMinYearly).toBeNull();
  });

  it("reads a payload that is not an object as an empty project", () => {
    expect(normalizeSearchProject("profile-1", null).contractTypes).toEqual([]);
    expect(normalizeSearchProject("profile-1", "cdi").targetRoles).toEqual([]);
  });
});

describe("parseLegacyContractTypes", () => {
  it.each([
    ["CDI", ["cdi"]],
    ["Stage ou alternance", ["stage", "alternance"]],
    ["Internship / Apprenticeship", ["stage", "alternance"]],
    ["CDD, intérim", ["cdd", "interim"]],
    ["Freelance (portage)", ["freelance"]],
    ["contrat d'apprentissage", ["alternance"]],
    ["", []],
    ["je cherche un poste", []],
  ])("reads %j as %j", (value, expected) => {
    expect(parseLegacyContractTypes(value)).toEqual(expected);
  });

  it("does not read a stray word as a VIE", () => {
    expect(parseLegacyContractTypes("un bon équilibre de vie")).toEqual([]);
    expect(parseLegacyContractTypes("VIE à l'étranger")).toEqual(["vie"]);
  });
});
