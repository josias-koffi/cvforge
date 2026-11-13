import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";
import {
  buildConcurrentIndexes,
  CONCURRENT_INDEXES,
} from "./concurrent-indexes";
import type { Database, DatabaseConfig } from "./database.types";
import { waitForDatabase } from "./wait-for-database";

export type DatabaseClient = {
  db: Database;
  close: () => Promise<void>;
};

export function createDatabaseClient(config: DatabaseConfig): DatabaseClient {
  const pool = new Pool({ connectionString: config.url, max: config.poolMax });
  const db = drizzle(pool, { schema });

  return { db, close: () => pool.end() };
}

/** Applies every pending SQL migration of `config.migrationsDir`, in order. */
export async function runMigrations(config: DatabaseConfig) {
  const pool = new Pool({ connectionString: config.url, max: 1 });

  try {
    await waitForDatabase(() => pool.query("select 1"));
    await migrate(drizzle(pool), { migrationsFolder: config.migrationsDir });
  } finally {
    await pool.end();
  }
}

/**
 * Builds the indexes of `CONCURRENT_INDEXES` that are missing, while the API
 * serves. Never throws: a failure is logged and retried on the next start.
 */
export async function buildIndexesInBackground(config: DatabaseConfig) {
  if (CONCURRENT_INDEXES.length === 0) return;

  const pool = new Pool({ connectionString: config.url, max: 1 });

  try {
    const client = await pool.connect();

    try {
      await buildConcurrentIndexes(client);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[indexes] build failed, retried on the next start:", error);
  } finally {
    await pool.end();
  }
}
