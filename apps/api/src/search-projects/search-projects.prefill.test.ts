import { describe, expect, it } from "vitest";
import type { StoredProfile } from "../profiles/profiles.types";
import { prefillSearchProject } from "./search-projects.prefill";

function makeProfile(overrides: Partial<StoredProfile> = {}): StoredProfile {
  return {
    headline: "Développeuse Full Stack",
    id: "profile-1",
    identity: {
      city: "Nantes",
      drivingLicenses: [],
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      links: [],
      phone: "",
    },
    label: "Profil principal",
    meta: { lastSavedAt: null, maxProfiles: 3, source: "storage" },
    preferences: {
      availabilityDate: "",
      availabilityMode: "immediate",
      contractTypes: "Stage ou alternance",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [
        { company: "ACME", period: "2024-2026", results: "", role: "Développeuse React" },
      ],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: ["TypeScript"],
    },
    ...overrides,
  };
}

describe("prefillSearchProject", () => {
  it("reads the roles, the city and the legacy contract text", () => {
    const project = prefillSearchProject(makeProfile());

    expect(project.targetRoles).toEqual([
      "Développeuse Full Stack",
      "Développeuse React",
    ]);
    expect(project.contractTypes).toEqual(["stage", "alternance"]);
    // Placed from its name: a city without a point matches no offer.
    expect(project.locations).toEqual([
      {
        department: "44",
        inseeCode: "44109",
        label: "Nantes",
        latitude: expect.closeTo(47.24, 1),
        longitude: expect.closeTo(-1.56, 1),
        radiusKm: 25,
      },
    ]);
  });

  it("does not repeat a role the headline already says", () => {
    const profile = makeProfile({ headline: "Développeuse React" });

    expect(prefillSearchProject(profile).targetRoles).toEqual([
      "Développeuse React",
    ]);
  });

  it("leaves everything blank when the profile says nothing", () => {
    const profile = makeProfile({
      headline: "",
      identity: { ...makeProfile().identity, city: "" },
      preferences: {
        availabilityDate: "",
        availabilityMode: "",
        contractTypes: "",
      },
      sections: { ...makeProfile().sections, experiences: [] },
    });
    const project = prefillSearchProject(profile);

    expect(project.targetRoles).toEqual([]);
    expect(project.locations).toEqual([]);
    expect(project.contractTypes).toEqual([]);
    // Nothing is guessed: the digest stays off until the candidate says so.
    expect(project.digestEnabled).toBe(false);
  });
});
