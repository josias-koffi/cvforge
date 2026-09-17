import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per one-shot import of legacy JSON state into Postgres, so each
 * import runs exactly once per environment whatever the number of restarts.
 */
export const dataImports = pgTable("data_imports", {
  name: text("name").primaryKey(),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
