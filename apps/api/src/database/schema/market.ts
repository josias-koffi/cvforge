import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * The labour market of one ROME job in one department (US-128): a monthly
 * copy of public figures from France Travail's Marché du travail API.
 */
export const marketStats = pgTable(
  "market_stats",
  {
    romeCode: text("rome_code").notNull(),
    department: text("department").notNull(),
    romeLabel: text("rome_label").notNull().default(""),
    /** INSEE region code, to find the other departments of the region. */
    region: text("region").notNull().default(""),
    tensionLevel: integer("tension_level"),
    tensionPeriod: text("tension_period"),
    offersCount: integer("offers_count"),
    offersYearCount: integer("offers_year_count"),
    offersPeriod: text("offers_period"),
    jobseekersCount: integer("jobseekers_count"),
    jobseekersPeriod: text("jobseekers_period"),
    salaryMedianYearly: integer("salary_median_yearly"),
    salarySample: integer("salary_sample"),
    salaryPeriod: text("salary_period"),
    /** What the last refresh changed notably, for the morning e-mail. */
    changeNote: text("change_note"),
    changedAt: timestamp("changed_at", { withTimezone: true }),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.romeCode, table.department] }),
    index("market_stats_rome_region_idx").on(table.romeCode, table.region),
  ],
);

/**
 * The (job, department) pairs a visitor of the free job market tool asked
 * for and the radar had never read (US-137). The monthly refresh reads them
 * after the candidates' own: the page itself never calls France Travail.
 */
export const marketDemand = pgTable(
  "market_demand",
  {
    romeCode: text("rome_code").notNull(),
    department: text("department").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.romeCode, table.department] }),
    index("market_demand_requested_idx").on(table.requestedAt),
  ],
);
