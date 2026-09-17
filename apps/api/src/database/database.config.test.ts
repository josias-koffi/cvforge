import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDatabaseConfig } from "./database.config";

describe("resolveDatabaseConfig", () => {
  it("uses DATABASE_URL and DATABASE_POOL_MAX when set", () => {
    const config = resolveDatabaseConfig({
      DATABASE_URL: " postgres://u:p@db:5432/app ",
      DATABASE_POOL_MAX: "4",
    });

    expect(config.url).toBe("postgres://u:p@db:5432/app");
    expect(config.poolMax).toBe(4);
  });

  it("falls back to the local compose database outside production", () => {
    const config = resolveDatabaseConfig({ DATABASE_POOL_MAX: "zero" });

    expect(config.url).toBe("postgresql://cvforge:secret@localhost:5432/cvforge");
    expect(config.poolMax).toBe(10);
  });

  it("refuses to start in production without DATABASE_URL", () => {
    expect(() => resolveDatabaseConfig({ NODE_ENV: "production" })).toThrow(
      "DATABASE_URL is required in production.",
    );
  });

  it("finds the migrations from the repository root", () => {
    const root = mkdtempSync(join(tmpdir(), "cvforge-db-"));
    mkdirSync(join(root, "apps/api/drizzle"), { recursive: true });

    expect(resolveDatabaseConfig({}, root).migrationsDir).toBe(
      join(root, "apps/api/drizzle"),
    );
  });

  it("honours an explicit DATABASE_MIGRATIONS_DIR", () => {
    expect(
      resolveDatabaseConfig({ DATABASE_MIGRATIONS_DIR: "sql" }, "/srv").migrationsDir,
    ).toBe("/srv/sql");
  });
});
