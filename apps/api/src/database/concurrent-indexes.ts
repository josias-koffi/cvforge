/**
 * Indexes on large tables, built with `CREATE INDEX CONCURRENTLY` once the API
 * is up, instead of in a migration.
 *
 * Why: the Drizzle migrator runs every migration in one transaction, where
 * CONCURRENTLY is refused, and the API only starts once the migrations are
 * done. On 2026-11-13, `0061_jobs_search_index.sql` built a GIN index over
 * 500,000 offers in about 20 minutes: no API all along (Traefik answered 404)
 * and writes to "jobs" blocked. Built here, the index takes as long, but the
 * API serves meanwhile (with the old plans) and writes go on.
 *
 * Rules:
 * - A new index on a table of LARGE_TABLES goes in CONCURRENT_INDEXES, never
 *   in a migration (`migrations-guard.test.ts` checks it).
 * - `definition` is everything after the index name: `ON "jobs" USING ...`.
 * - Never edit an index that has shipped: give the new one another name, and
 *   drop the old one in a later migration (DROP INDEX is fast).
 * - A build that fails (or a container stopped mid-build) leaves an INVALID
 *   index behind: it is dropped and built again on the next start.
 */

/** Tables too large for an index built inside a migration. */
export const LARGE_TABLES = ["jobs"] as const;

export type ConcurrentIndex = {
  name: string;
  definition: string;
};

export const CONCURRENT_INDEXES: readonly ConcurrentIndex[] = [];

/** Any SQL client with `query(text, params)`: a pg PoolClient, PGlite. */
export type QueryClient = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

// One API process builds at a time (a redeploy can overlap two containers).
const ADVISORY_LOCK_KEY = 61_000_001;

function quoted(name: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`[indexes] invalid index name: ${name}`);
  }

  return `"${name}"`;
}

async function indexState(client: QueryClient, name: string) {
  const { rows } = await client.query(
    `select i.indisvalid as valid
       from pg_class c
       join pg_index i on i.indexrelid = c.oid
      where c.relname = $1 and c.relnamespace = 'public'::regnamespace`,
    [name],
  );

  if (rows.length === 0) return "missing";
  return rows[0].valid ? "valid" : "invalid";
}

export type BuildResult = {
  built: string[];
  skipped: string[];
  locked: boolean;
};

export async function buildConcurrentIndexes(
  client: QueryClient,
  indexes: readonly ConcurrentIndex[] = CONCURRENT_INDEXES,
  log: (message: string) => void = console.log,
): Promise<BuildResult> {
  const result: BuildResult = { built: [], skipped: [], locked: false };

  if (indexes.length === 0) return result;

  const { rows } = await client.query(
    "select pg_try_advisory_lock($1) as locked",
    [ADVISORY_LOCK_KEY],
  );

  if (!rows[0]?.locked) {
    log("[indexes] another process is building the indexes, skipping");
    result.locked = true;
    return result;
  }

  try {
    for (const index of indexes) {
      const name = quoted(index.name);
      const state = await indexState(client, index.name);

      if (state === "valid") {
        result.skipped.push(index.name);
        continue;
      }

      if (state === "invalid") {
        log(
          `[indexes] ${index.name}: left invalid by an interrupted build, dropping it`,
        );
        await client.query(`drop index concurrently if exists ${name}`);
      }

      const started = Date.now();
      log(`[indexes] ${index.name}: building (the API keeps serving)`);
      await client.query(
        `create index concurrently if not exists ${name} ${index.definition}`,
      );
      log(
        `[indexes] ${index.name}: built in ${Math.round((Date.now() - started) / 1000)} s`,
      );
      result.built.push(index.name);
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
  }

  return result;
}
