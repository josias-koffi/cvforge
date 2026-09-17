import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Database, DatabaseConfig } from "./database.types";

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
    await migrate(drizzle(pool), { migrationsFolder: config.migrationsDir });
  } finally {
    await pool.end();
  }
}
