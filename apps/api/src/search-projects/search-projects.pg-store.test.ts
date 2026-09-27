import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgProfilesStore } from "../profiles/profiles.pg-store";
import type { StoredProfile } from "../profiles/profiles.types";
import { PgSearchProjectsStore } from "./search-projects.pg-store";

let testDatabase: TestDatabase;
let store: PgSearchProjectsStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgSearchProjectsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

function makeProject(
  profileId: string,
  overrides: Partial<SearchProject> = {},
): SearchProject {
  return {
    ...emptySearchProject(profileId),
    contractTypes: ["stage", "alternance"],
    digestEnabled: true,
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
    sectors: ["numerique"],
    targetRoles: ["Développeuse Full Stack"],
    ...overrides,
  };
}

function makeProfile(id: string): StoredProfile {
  return {
    headline: "",
    id,
    identity: {
      city: "Nantes",
      email: "jane@example.com",
      firstName: "Jane",
      github: "",
      lastName: "Doe",
      linkedIn: "",
      otherLink: "",
      phone: "",
      portfolio: "",
    },
    label: `Profil ${id}`,
    meta: { lastSavedAt: null, maxProfiles: 3, source: "storage" },
    preferences: {
      availabilityDate: "",
      availabilityMode: "immediate",
      contractTypes: "",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: [],
    },
  };
}

describe("PgSearchProjectsStore", () => {
  it("saves a project and reads it back", async () => {
    const saved = await store.save("user@example.com", makeProject("profile-1"));

    expect(saved.targetRoles).toEqual(["Développeuse Full Stack"]);
    expect(saved.updatedAt).not.toBeNull();

    const found = await store.findByProfileId("user@example.com", "profile-1");

    expect(found).toMatchObject({
      contractTypes: ["stage", "alternance"],
      digestEnabled: true,
      profileId: "profile-1",
      sectors: ["numerique"],
    });
    expect(found?.locations[0]?.label).toBe("Nantes");
  });

  it("replaces the project of a profile instead of adding a second one", async () => {
    await store.save("user@example.com", makeProject("profile-1"));
    await store.save(
      "user@example.com",
      makeProject("profile-1", { digestEnabled: false, targetRoles: ["Data"] }),
    );

    const projects = await store.listByUserEmail("user@example.com");

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      digestEnabled: false,
      targetRoles: ["Data"],
    });
  });

  it("keeps each profile's project apart, and each user's", async () => {
    await store.save("user@example.com", makeProject("profile-1"));
    await store.save("user@example.com", makeProject("profile-2"));
    await store.save("other@example.com", makeProject("profile-1"));

    expect(await store.listByUserEmail("user@example.com")).toHaveLength(2);
    expect(
      await store.findByProfileId("other@example.com", "profile-2"),
    ).toBeNull();
  });

  /**
   * `PgProfilesStore.save` deletes and re-inserts every profile row, so a
   * foreign key with a cascade would drop the search project on each save.
   */
  it("survives a profile registry rewrite", async () => {
    const profiles = new PgProfilesStore(testDatabase.db);
    await profiles.save("user@example.com", {
      activeProfileId: "profile-1",
      profiles: [makeProfile("profile-1")],
      userEmail: "user@example.com",
      version: 2,
    });
    await store.save("user@example.com", makeProject("profile-1"));

    await profiles.save("user@example.com", {
      activeProfileId: "profile-1",
      profiles: [makeProfile("profile-1")],
      userEmail: "user@example.com",
      version: 2,
    });

    expect(
      await store.findByProfileId("user@example.com", "profile-1"),
    ).not.toBeNull();
  });

  it("deletes every project of a user", async () => {
    await store.save("user@example.com", makeProject("profile-1"));
    await store.save("user@example.com", makeProject("profile-2"));
    await store.save("other@example.com", makeProject("profile-1"));

    expect(await store.deleteByUserEmail("user@example.com")).toBe(2);
    expect(await store.listByUserEmail("user@example.com")).toEqual([]);
    expect(await store.listByUserEmail("other@example.com")).toHaveLength(1);
  });
});
