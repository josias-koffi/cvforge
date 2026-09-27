import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { romeSyncRuns } from "../database/schema";
import { PgRomeStore } from "./rome.pg-store";
import type { RomeCodeHolder, RomeReferential } from "./rome.types";

let testDatabase: TestDatabase;
let store: PgRomeStore;

const VERSIONS = { competences: "61", fichesMetiers: "61", metiers: "61" };

function referential(metierCodes: string[], linkCount = 1): RomeReferential {
  return {
    appellations: metierCodes.map((code) => ({
      code: `A-${code}`,
      libelle: `Appellation ${code}`,
      libelleCourt: code,
      libelleSearch: `appellation ${code.toLowerCase()}`,
      metierCode: code,
    })),
    competences: [{ code: "C1", libelle: "Soudage", type: "SAVOIR" }],
    links: metierCodes
      .slice(0, linkCount)
      .map((code) => ({ competenceCode: "C1", metierCode: code })),
    metiers: metierCodes.map((code) => ({
      code,
      domaineCode: "M18",
      domaineLibelle: "SI",
      grandDomaineCode: "M",
      grandDomaineLibelle: "Support",
      libelle: `Métier ${code}`,
    })),
    versions: VERSIONS,
  };
}

/** A user table the way US-118 will store codes: one row per (user, project, code). */
const HOLDER: RomeCodeHolder = {
  column: "appellation_code",
  entity: "appellation",
  scope: ["user_email", "profile_id"],
  table: "test_rome_holder",
};

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgRomeStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.db.execute(sql`drop table if exists test_rome_holder`);
  await testDatabase.reset();
  await testDatabase.db.execute(sql`
    create table test_rome_holder (
      user_email text not null,
      profile_id text not null,
      appellation_code text not null,
      primary key (user_email, profile_id, appellation_code)
    )`);
});

async function holderRows() {
  type Row = {
    user_email: string;
    profile_id: string;
    appellation_code: string;
  };
  const result = (await testDatabase.db.execute(
    sql`select * from test_rome_holder order by user_email, profile_id, appellation_code`,
  )) as unknown as { rows: Row[] };

  return result.rows.map(
    (row) => `${row.user_email}/${row.profile_id}/${row.appellation_code}`,
  );
}

describe("PgRomeStore — the sync lock", () => {
  it("lets one sync run at a time, then the next one after it finished", async () => {
    const first = await store.claimRun();

    expect(first).not.toBeNull();
    expect(await store.claimRun()).toBeNull();

    await store.finishRun(first!.id, { stats: { ok: true }, status: "done" });

    expect(await store.claimRun()).not.toBeNull();
  });

  it("frees a lock left by a dead process, and only an old one", async () => {
    const run = await store.claimRun();

    expect(await store.recoverStale(60_000)).toBe(0);

    await testDatabase.db
      .update(romeSyncRuns)
      .set({ startedAt: new Date(Date.now() - 3 * 3_600_000) })
      .where(sql`id = ${run!.id}`);

    expect(await store.recoverStale(60_000)).toBe(1);
    expect(await store.claimRun()).not.toBeNull();
  });

  it("finds the last run, and the last successful one", async () => {
    expect(await store.lastRun()).toBeNull();

    const done = await store.claimRun();
    await store.finishRun(done!.id, { stats: { counts: 1 }, status: "done" });
    const failed = await store.claimRun();
    await store.finishRun(failed!.id, {
      stats: { error: "x" },
      status: "failed",
    });

    expect(await store.lastRun()).toMatchObject({
      id: failed!.id,
      status: "failed",
    });
    expect(await store.lastRun("done")).toMatchObject({
      id: done!.id,
      stats: { counts: 1 },
      status: "done",
    });
  });
});

describe("PgRomeStore — the referential", () => {
  it("replaces the whole referential, and a replay leaves the same content", async () => {
    await store.replace(referential(["M1", "M2"]));
    await store.replace(referential(["M1", "M3"]));
    await store.replace(referential(["M1", "M3"]));

    expect(await store.counts()).toEqual({
      appellations: 2,
      competences: 1,
      links: 1,
      metiers: 2,
    });
    expect([...(await store.codes("metier"))].sort()).toEqual(["M1", "M3"]);
    expect([...(await store.codes("appellation"))].sort()).toEqual([
      "A-M1",
      "A-M3",
    ]);
    expect([...(await store.codes("competence"))]).toEqual(["C1"]);
  });

  it("keeps the previous referential when the replacement fails midway", async () => {
    await store.replace(referential(["M1", "M2"]));

    const broken = referential(["M1", "M9"]);
    broken.links.push({ competenceCode: "UNKNOWN", metierCode: "M1" });

    await expect(store.replace(broken)).rejects.toThrow();
    expect([...(await store.codes("metier"))].sort()).toEqual(["M1", "M2"]);
    expect((await store.counts()).links).toBe(1);
  });

  it("inserts more rows than a single statement can bind", async () => {
    const codes = Array.from({ length: 4_500 }, (_, index) => `M${index}`);

    await store.replace(referential(codes, codes.length));

    expect(await store.counts()).toEqual({
      appellations: 4_500,
      competences: 1,
      links: 4_500,
      metiers: 4_500,
    });
  });
});

describe("PgRomeStore — substitutions", () => {
  it("records a substitution once, and ignores a code replaced by itself", async () => {
    const substitution = {
      entity: "appellation" as const,
      newCode: "B",
      oldCode: "A",
    };

    expect(
      await store.recordSubstitutions([
        substitution,
        { ...substitution, newCode: "A" },
      ]),
    ).toBe(1);
    expect(await store.recordSubstitutions([substitution])).toBe(0);
    expect(await store.recordSubstitutions([])).toBe(0);
    expect(await store.pendingSubstitutions()).toEqual([
      expect.objectContaining({
        entity: "appellation",
        newCode: "B",
        oldCode: "A",
      }),
    ]);
  });

  it("rewrites the old code, removes the duplicates it would create, and stamps the entry", async () => {
    await testDatabase.db.execute(sql`
      insert into test_rome_holder values
        ('ana@x.fr', 'p1', 'OLD'),
        ('ana@x.fr', 'p1', 'NEW'),
        ('ana@x.fr', 'p2', 'OLD'),
        ('bob@x.fr', 'p1', 'OLD'),
        ('bob@x.fr', 'p1', 'OTHER')`);
    await store.recordSubstitutions([
      { entity: "appellation", newCode: "NEW", oldCode: "OLD" },
    ]);
    const [pending] = await store.pendingSubstitutions();

    const outcome = await store.applySubstitution(pending!, [
      HOLDER,
      { ...HOLDER, entity: "metier", table: "not_touched" },
    ]);

    expect(outcome).toEqual({
      test_rome_holder: { duplicatesRemoved: 1, rewritten: 2 },
    });
    expect(await holderRows()).toEqual([
      "ana@x.fr/p1/NEW",
      "ana@x.fr/p2/NEW",
      "bob@x.fr/p1/NEW",
      "bob@x.fr/p1/OTHER",
    ]);
    expect(await store.pendingSubstitutions()).toEqual([]);
  });

  it("lists the codes users hold for an entity, once each", async () => {
    await testDatabase.db.execute(sql`
      insert into test_rome_holder values
        ('ana@x.fr', 'p1', 'OLD'),
        ('bob@x.fr', 'p1', 'OLD'),
        ('bob@x.fr', 'p1', 'OTHER')`);

    expect(await store.heldCodes("appellation", [HOLDER])).toEqual(
      new Set(["OLD", "OTHER"]),
    );
    expect(await store.heldCodes("metier", [HOLDER])).toEqual(new Set());
  });

  it("refuses a holder whose name could inject SQL", async () => {
    await store.recordSubstitutions([
      { entity: "appellation", newCode: "B", oldCode: "A" },
    ]);
    const [pending] = await store.pendingSubstitutions();

    await expect(
      store.applySubstitution(pending!, [
        { ...HOLDER, table: "x; drop table rome_metiers" },
      ]),
    ).rejects.toThrow(/Invalid SQL identifier/);
    // Nothing was stamped: the substitution will be tried again.
    expect(await store.pendingSubstitutions()).toHaveLength(1);
  });
});
