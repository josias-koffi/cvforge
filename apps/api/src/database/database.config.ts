import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { DatabaseConfig } from "./database.types";

const DEFAULT_DEV_URL = "postgresql://cvforge:secret@localhost:5432/cvforge";
const DEFAULT_POOL_MAX = 10;

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * The SQL migrations live in `apps/api/drizzle`. The API runs from `apps/api`
 * in development and from the repository root in the Docker image, so both
 * locations are probed unless `DATABASE_MIGRATIONS_DIR` pins one.
 */
function resolveMigrationsDir(env: NodeJS.ProcessEnv, cwd: string) {
  const explicit = env.DATABASE_MIGRATIONS_DIR?.trim();

  if (explicit) {
    return resolve(cwd, explicit);
  }

  const candidates = [resolve(cwd, "drizzle"), resolve(cwd, "apps/api/drizzle")];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export function resolveDatabaseConfig(
  env: NodeJS.ProcessEnv,
  cwd: string = process.cwd(),
): DatabaseConfig {
  const url =
    env.DATABASE_URL?.trim() ||
    (env.NODE_ENV === "production" ? "" : DEFAULT_DEV_URL);

  if (!url) {
    throw new Error("DATABASE_URL is required in production.");
  }

  return {
    url,
    poolMax: parsePositiveInt(env.DATABASE_POOL_MAX, DEFAULT_POOL_MAX),
    migrationsDir: resolveMigrationsDir(env, cwd),
  };
}
