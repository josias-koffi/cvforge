import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * One La Bonne Boîte query — a ROME job near a place — and when it was last
 * read (US-119). Kept apart from its companies so that "read, nobody found"
 * is not mistaken for "never read".
 */
export const hiringCompanyQueries = pgTable("hiring_company_queries", {
  /** `<rome>|<place>`, e.g. `M1805|city:44109:30`. */
  queryKey: text("query_key").primaryKey(),
  romeCode: text("rome_code").notNull(),
  romeLabel: text("rome_label").notNull().default(""),
  place: text("place").notNull(),
  /** How many companies La Bonne Boîte counted, beyond the ones kept. */
  hits: integer("hits").notNull().default(0),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** The companies of one query, as La Bonne Boîte ranked them. */
export const hiringCompanies = pgTable(
  "hiring_companies",
  {
    queryKey: text("query_key").notNull(),
    siret: text("siret").notNull(),
    name: text("name").notNull(),
    nafCode: text("naf_code").notNull().default(""),
    nafLabel: text("naf_label").notNull().default(""),
    city: text("city").notNull().default(""),
    postcode: text("postcode").notNull().default(""),
    department: text("department").notNull().default(""),
    latitude: real("latitude"),
    longitude: real("longitude"),
    headcountMin: integer("headcount_min"),
    headcountMax: integer("headcount_max"),
    hiringPotential: real("hiring_potential").notNull().default(0),
    highPotential: boolean("high_potential").notNull().default(false),
    /** La Bonne Boîte's `email: "yes"`: it can reach the company (US-120). */
    reachableByEmail: boolean("reachable_by_email").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.queryKey, table.siret] })],
);
