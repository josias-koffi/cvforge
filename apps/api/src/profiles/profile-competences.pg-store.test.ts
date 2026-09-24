import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { ROME_CODE_HOLDERS } from "../rome/rome.module";
import { PgRomeStore } from "../rome/rome.pg-store";
import { PgProfileCompetencesStore } from "./profile-competences.pg-store";
import { PgProfilesStore } from "./profiles.pg-store";

let testDatabase: TestDatabase;
let store: PgProfileCompetencesStore;
let romeStore: PgRomeStore;

const ANA = "ana@example.com";
const BOB = "bob@example.com";

const AGILE = {
  code: "113277",
  libelle: "Méthode AGILE",
  score: 0.84,
  type: "SAVOIR",
};
const PROJECT = {
  code: "120246",
  libelle: "Gestion de projet",
  score: 1,
  type: "SAVOIR",
};
const DOCTORATE = {
  code: "999001",
  libelle: "Doctorat",
  score: 0.83,
  type: "SAVOIR",
};

async function rows(table: string) {
  const result = (await testDatabase.db.execute(
    sql.raw(`select user_email, profile_id from ${table} order by 1, 2`),
  )) as unknown as { rows: Array<{ user_email: string; profile_id: string }> };

  return result.rows;
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgProfileCompetencesStore(testDatabase.db);
  romeStore = new PgRomeStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgProfileCompetencesStore", () => {
  it("lists the inferred competences by confidence, per profile", async () => {
    await store.replaceInferred(ANA, "p1", "f1", [AGILE, PROJECT]);

    expect(await store.list(ANA, "p1")).toEqual([PROJECT, AGILE]);
    expect(await store.fingerprint(ANA, "p1")).toBe("f1");
    expect(await store.list(ANA, "p2")).toEqual([]);
    expect(await store.fingerprint(ANA, "p2")).toBeNull();
    expect(await store.list(BOB, "p1")).toEqual([]);
  });

  it("keeps a removed competence out of every later reading", async () => {
    await store.replaceInferred(ANA, "p1", "f1", [AGILE, DOCTORATE]);

    expect(await store.dismiss(ANA, "p1", DOCTORATE.code)).toBe(true);
    expect(await store.dismiss(ANA, "p1", "unknown")).toBe(false);
    expect(await store.dismissedCodes(ANA, "p1")).toEqual(
      new Set([DOCTORATE.code]),
    );

    await store.replaceInferred(ANA, "p1", "f2", [PROJECT, DOCTORATE]);

    expect(await store.list(ANA, "p1")).toEqual([PROJECT]);
    expect(await store.dismissedCodes(ANA, "p1")).toEqual(
      new Set([DOCTORATE.code]),
    );
    expect(await store.fingerprint(ANA, "p1")).toBe("f2");
  });

  it("records the fingerprint even when the CV yields nothing", async () => {
    await store.replaceInferred(ANA, "p1", "f1", [AGILE]);
    await store.replaceInferred(ANA, "p1", "empty", []);

    expect(await store.list(ANA, "p1")).toEqual([]);
    expect(await store.fingerprint(ANA, "p1")).toBe("empty");
  });

  it("shows the referential's current label when it knows the code", async () => {
    await romeStore.replace({
      appellations: [],
      competences: [
        { code: AGILE.code, libelle: "Méthodes agiles", type: "SAVOIR" },
      ],
      links: [],
      metiers: [],
      versions: { competences: null, fichesMetiers: null, metiers: null },
    });
    await store.replaceInferred(ANA, "p1", "f1", [AGILE]);

    expect(await store.list(ANA, "p1")).toEqual([
      { ...AGILE, libelle: "Méthodes agiles" },
    ]);
  });

  it("forgets the profiles the registry no longer has", async () => {
    await store.replaceInferred(ANA, "p1", "f1", [AGILE]);
    await store.replaceInferred(ANA, "p2", "f2", [AGILE]);
    await store.replaceInferred(BOB, "p2", "f3", [AGILE]);

    await store.forgetOtherProfiles(ANA, ["p1"]);

    expect(await rows("profile_rome_competences")).toEqual([
      { profile_id: "p1", user_email: ANA },
      { profile_id: "p2", user_email: BOB },
    ]);
    expect(await rows("profile_rome_inferences")).toEqual([
      { profile_id: "p1", user_email: ANA },
      { profile_id: "p2", user_email: BOB },
    ]);

    await store.forgetOtherProfiles(ANA, []);
    expect(await store.list(ANA, "p1")).toEqual([]);
  });

  it("follows a ROME substitution, declared as a code holder", async () => {
    await store.replaceInferred(ANA, "p1", "f1", [{ ...AGILE, code: "OLD" }]);
    await store.replaceInferred(ANA, "p2", "f2", [
      { ...AGILE, code: "OLD" },
      AGILE,
    ]);
    await romeStore.recordSubstitutions([
      { entity: "competence", newCode: AGILE.code, oldCode: "OLD" },
    ]);
    const [substitution] = await romeStore.pendingSubstitutions();

    expect(
      await romeStore.applySubstitution(substitution!, ROME_CODE_HOLDERS),
    ).toEqual({
      profile_rome_competences: { duplicatesRemoved: 1, rewritten: 1 },
    });
    expect((await store.list(ANA, "p1")).map((entry) => entry.code)).toEqual([
      AGILE.code,
    ]);
    expect((await store.list(ANA, "p2")).map((entry) => entry.code)).toEqual([
      AGILE.code,
    ]);
  });

  it("is purged with the account's profiles", async () => {
    await store.replaceInferred(ANA, "p1", "f1", [AGILE]);
    await store.dismiss(ANA, "p1", AGILE.code);
    await store.replaceInferred(BOB, "p1", "f2", [AGILE]);

    await new PgProfilesStore(testDatabase.db).deleteByUserEmail(ANA);

    expect(await rows("profile_rome_competences")).toEqual([
      { profile_id: "p1", user_email: BOB },
    ]);
    expect(await rows("profile_rome_inferences")).toEqual([
      { profile_id: "p1", user_email: BOB },
    ]);
  });
});
