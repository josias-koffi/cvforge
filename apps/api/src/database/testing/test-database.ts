import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { resolve } from "node:path";
import * as schema from "../schema";
import type { Database } from "../database.types";

const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

export type TestDatabase = {
  db: Database;
  close: () => Promise<void>;
};

/**
 * In-memory Postgres (PGlite, a WASM build of the real engine) with every
 * migration applied. Tests exercise the same SQL as production without Docker.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  return { db: db as unknown as Database, close: () => client.close() };
}
