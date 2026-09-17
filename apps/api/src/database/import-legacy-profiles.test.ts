import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgProfilesStore } from "../profiles/profiles.pg-store";
import { importLegacyProfiles } from "./import-legacy-profiles";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

function legacyProfile(id: string, overrides: Record<string, unknown> = {}) {
  return {
    headline: "Senior Product Engineer",
    id,
    identity: { city: "Paris", firstName: "Jane", lastName: "Doe" },
    label: `Profil ${id}`,
    meta: { lastSavedAt: "2026-04-20T12:00:00.000Z", source: "storage" },
    preferences: { availabilityMode: "immediate", contractTypes: "CDI" },
    sections: { summary: "Resume", technicalSkills: ["TypeScript"] },
    ...overrides,
  };
}

describe("importLegacyProfiles", () => {
  let testDatabase: TestDatabase;
  let store: PgProfilesStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-profiles-"));
  let fileCounter = 0;

  function writeState(registries: Record<string, unknown>) {
    const filePath = join(directory, `state-${(fileCounter += 1)}.json`);

    writeFileSync(filePath, JSON.stringify({ registries }));

    return filePath;
  }

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

  it("records a missing file as imported, with nothing to copy", async () => {
    const result = await importLegacyProfiles(
      testDatabase.db,
      join(directory, "does-not-exist.json"),
    );

    expect(result).toEqual({ status: "imported", registries: 0, profiles: 0 });
  });

  it("copies each user's registry in, order preserved", async () => {
    const filePath = writeState({
      "user@example.com": {
        activeProfileId: "p-2",
        profiles: [legacyProfile("p-1"), legacyProfile("p-2")],
        userEmail: "user@example.com",
        version: 2,
      },
      "other@example.com": {
        activeProfileId: "p-3",
        profiles: [legacyProfile("p-3")],
        userEmail: "other@example.com",
        version: 2,
      },
    });

    const result = await importLegacyProfiles(testDatabase.db, filePath);

    expect(result).toEqual({ status: "imported", registries: 2, profiles: 3 });

    const found = await store.findByUserEmail("user@example.com");
    expect(found?.profiles.map(({ id }) => id)).toEqual(["p-1", "p-2"]);
    expect(found?.activeProfileId).toBe("p-2");
  });

  it("runs once per environment", async () => {
    const filePath = writeState({
      "user@example.com": {
        activeProfileId: "p-1",
        profiles: [legacyProfile("p-1")],
      },
    });

    await importLegacyProfiles(testDatabase.db, filePath);
    const second = await importLegacyProfiles(testDatabase.db, filePath);

    expect(second).toEqual({ status: "already_imported" });
  });

  it("fills the gaps the file store used to patch on read", async () => {
    // No identity, no preferences, no sections, no meta — all `not null`
    // columns that a raw insert would reject.
    const filePath = writeState({
      "user@example.com": { activeProfileId: "bare", profiles: [{ id: "bare" }] },
    });

    await importLegacyProfiles(testDatabase.db, filePath);

    const found = await store.findByUserEmail("user@example.com");

    expect(found?.profiles[0]).toMatchObject({
      headline: "",
      id: "bare",
      identity: { city: "", firstName: "", lastName: "" },
      label: "Profil",
      meta: { lastSavedAt: null, maxProfiles: null },
      sections: { summary: "", technicalSkills: [] },
    });
  });

  it("skips a registry whose profiles are all unusable", async () => {
    const filePath = writeState({
      "user@example.com": { activeProfileId: "x", profiles: [{}, null] },
    });

    const result = await importLegacyProfiles(testDatabase.db, filePath);

    expect(result).toEqual({ status: "imported", registries: 0, profiles: 0 });
    await expect(store.findByUserEmail("user@example.com")).resolves.toBeNull();
  });

  it("repairs an active id that points at nothing", async () => {
    const filePath = writeState({
      "user@example.com": {
        activeProfileId: "deleted-long-ago",
        profiles: [legacyProfile("p-1")],
      },
    });

    await importLegacyProfiles(testDatabase.db, filePath);

    await expect(
      store.findByUserEmail("user@example.com"),
    ).resolves.toMatchObject({ activeProfileId: "p-1" });
  });
});
