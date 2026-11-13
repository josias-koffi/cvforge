import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LARGE_TABLES } from "./concurrent-indexes";

const MIGRATIONS_DIR = resolve(__dirname, "../../drizzle");

// Up to here, indexes on large tables were built inside migrations (0061 kept
// the API down for about 20 minutes in production on 2026-11-13).
const LAST_GRANDFATHERED = 61;

describe("migrations", () => {
  it("never build an index on a large table: concurrent-indexes.ts does", () => {
    const offenders = readdirSync(MIGRATIONS_DIR)
      .filter((file) => /^\d{4}_.*\.sql$/.test(file))
      .filter(
        (file) => Number.parseInt(file.slice(0, 4), 10) > LAST_GRANDFATHERED,
      )
      .flatMap((file) => {
        const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");

        return LARGE_TABLES.filter((table) =>
          new RegExp(
            `create\\s+(unique\\s+)?index[^;]*\\bon\\s+(only\\s+)?"?${table}"?[\\s(]`,
            "i",
          ).test(sql),
        ).map((table) => `${file} → ${table}`);
      });

    expect(offenders).toEqual([]);
  });
});
