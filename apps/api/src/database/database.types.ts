import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export const DATABASE = Symbol("DATABASE");

export type DatabaseSchema = typeof schema;

/**
 * Driver-agnostic handle: node-postgres in the running API, PGlite in tests.
 * Stores depend on this type only, never on a concrete driver.
 */
export type Database = PgDatabase<PgQueryResultHKT, DatabaseSchema>;

export type DatabaseConfig = {
  url: string;
  poolMax: number;
  migrationsDir: string;
};
