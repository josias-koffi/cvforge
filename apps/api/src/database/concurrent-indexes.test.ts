import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildConcurrentIndexes,
  CONCURRENT_INDEXES,
  type ConcurrentIndex,
} from "./concurrent-indexes";

const INDEX: ConcurrentIndex = {
  name: "jobs_test_title_idx",
  definition: 'ON "jobs" ("title") WHERE "closed_at" IS NULL',
};

function isValid(client: PGlite, name: string) {
  return client
    .query<{
      valid: boolean;
    }>("select i.indisvalid as valid from pg_class c join pg_index i on i.indexrelid = c.oid where c.relname = $1", [name])
    .then(({ rows }) => rows[0]?.valid);
}

describe("buildConcurrentIndexes", () => {
  let client: PGlite;
  const quiet = () => {};

  beforeEach(async () => {
    client = new PGlite();
    await client.exec(
      'create table "jobs" ("title" text, "closed_at" timestamptz)',
    );
  });

  afterEach(() => client.close());

  it("builds a missing index, then leaves it alone", async () => {
    expect(await buildConcurrentIndexes(client, [INDEX], quiet)).toEqual({
      built: ["jobs_test_title_idx"],
      skipped: [],
      locked: false,
    });
    expect(await isValid(client, INDEX.name)).toBe(true);

    expect(await buildConcurrentIndexes(client, [INDEX], quiet)).toEqual({
      built: [],
      skipped: ["jobs_test_title_idx"],
      locked: false,
    });
  });

  it("rebuilds an index left invalid by an interrupted build", async () => {
    await client.exec(`create index "${INDEX.name}" on "jobs" ("title")`);
    await client.exec(
      `update pg_index set indisvalid = false where indexrelid = '"${INDEX.name}"'::regclass`,
    );

    const result = await buildConcurrentIndexes(client, [INDEX], quiet);

    expect(result.built).toEqual([INDEX.name]);
    expect(await isValid(client, INDEX.name)).toBe(true);
  });

  it("skips when another process holds the lock", async () => {
    const holder = {
      query: async (text: string) =>
        text.includes("pg_try_advisory_lock")
          ? { rows: [{ locked: false }] }
          : { rows: [] },
    };

    expect(await buildConcurrentIndexes(holder, [INDEX], quiet)).toMatchObject({
      locked: true,
      built: [],
    });
  });

  it("releases the lock when a build fails", async () => {
    const broken = {
      name: "jobs_broken_idx",
      definition: 'ON "jobs" ("missing_column")',
    };

    await expect(
      buildConcurrentIndexes(client, [broken], quiet),
    ).rejects.toThrow();
    expect((await buildConcurrentIndexes(client, [INDEX], quiet)).locked).toBe(
      false,
    );
  });

  it("refuses an index name that would need quoting", async () => {
    await expect(
      buildConcurrentIndexes(
        client,
        [{ ...INDEX, name: 'x"; drop table jobs; --' }],
        quiet,
      ),
    ).rejects.toThrow(/invalid index name/);
  });

  it("does nothing without indexes", async () => {
    expect(await buildConcurrentIndexes(client, [], quiet)).toEqual({
      built: [],
      skipped: [],
      locked: false,
    });
  });

  it("only lists well-formed indexes", () => {
    for (const index of CONCURRENT_INDEXES) {
      expect(index.name).toMatch(/^[a-z_][a-z0-9_]*$/);
      expect(index.definition).toMatch(/^ON "/);
    }
  });
});
