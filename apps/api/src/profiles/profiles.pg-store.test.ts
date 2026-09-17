import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgProfilesStore } from "./profiles.pg-store";
import type { StoredProfile, StoredProfileRegistry } from "./profiles.types";

let testDatabase: TestDatabase;
let store: PgProfilesStore;

function makeProfile(
  id: string,
  overrides: Partial<StoredProfile> = {},
): StoredProfile {
  return {
    headline: "Senior Product Engineer",
    id,
    identity: {
      city: "Paris",
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
    meta: {
      lastSavedAt: "2026-04-20T12:00:00.000Z",
      maxProfiles: 3,
      source: "storage",
    },
    preferences: {
      availabilityDate: "",
      availabilityMode: "immediate",
      contractTypes: "CDI",
    },
    sections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: ["Mentoring"],
      summary: "Resume",
      technicalSkills: ["TypeScript"],
    },
    ...overrides,
  };
}

function makeRegistry(
  profiles: StoredProfile[],
  activeProfileId = profiles[0]?.id ?? "",
): StoredProfileRegistry {
  return {
    activeProfileId,
    profiles,
    userEmail: "user@example.com",
    version: 2,
  };
}

describe("PgProfilesStore", () => {
  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgProfilesStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("round-trips a registry", async () => {
    const registry = makeRegistry([makeProfile("p-1"), makeProfile("p-2")]);

    await store.save("user@example.com", registry);

    await expect(
      store.findByUserEmail("user@example.com"),
    ).resolves.toEqual(registry);
  });

  it("preserves the profile order", async () => {
    await store.save(
      "user@example.com",
      makeRegistry([makeProfile("c"), makeProfile("a"), makeProfile("b")]),
    );

    const found = await store.findByUserEmail("user@example.com");

    expect(found?.profiles.map(({ id }) => id)).toEqual(["c", "a", "b"]);
  });

  it("returns null for a user with no registry", async () => {
    await expect(store.findByUserEmail("nobody@example.com")).resolves.toBeNull();
  });

  it("forces the owner and the payload version", async () => {
    const saved = await store.save("user@example.com", {
      activeProfileId: "p-1",
      profiles: [makeProfile("p-1")],
      userEmail: "spoofed@example.com",
      version: 2,
    });

    expect(saved.userEmail).toBe("user@example.com");
    expect(saved.version).toBe(2);
  });

  it("replaces the previous profiles rather than adding to them", async () => {
    await store.save(
      "user@example.com",
      makeRegistry([makeProfile("p-1"), makeProfile("p-2")]),
    );

    await store.save("user@example.com", makeRegistry([makeProfile("p-3")]));

    const found = await store.findByUserEmail("user@example.com");

    expect(found?.profiles.map(({ id }) => id)).toEqual(["p-3"]);
    expect(found?.activeProfileId).toBe("p-3");
  });

  it("falls back to the first profile when the active id points at nothing", async () => {
    await store.save(
      "user@example.com",
      makeRegistry([makeProfile("p-1"), makeProfile("p-2")], "gone"),
    );

    await expect(
      store.findByUserEmail("user@example.com"),
    ).resolves.toMatchObject({ activeProfileId: "p-1" });
  });

  it("cascades the profiles away with the registry", async () => {
    await store.save(
      "user@example.com",
      makeRegistry([makeProfile("p-1"), makeProfile("p-2")]),
    );

    await expect(store.deleteByUserEmail("user@example.com")).resolves.toBe(1);

    await expect(store.findByUserEmail("user@example.com")).resolves.toBeNull();
    await expect(store.deleteByUserEmail("user@example.com")).resolves.toBe(0);
  });
});
