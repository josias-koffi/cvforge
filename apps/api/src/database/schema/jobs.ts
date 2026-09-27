import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ListingCompetence } from "../../job-search/job-search.types";

/**
 * One offer, as the candidate sees it — whatever number of sources publish it.
 *
 * The canonical fields are copied from the most trustworthy advert (the
 * company's own board before an aggregator), and `first_seen_at` is the oldest
 * date of them all: that is what makes a repost stay old instead of coming
 * back as new in the morning selection (ADR-023).
 */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    titleKey: text("title_key").notNull(),
    companyName: text("company_name").notNull().default(""),
    companyKey: text("company_key").notNull().default(""),
    companyAnonymous: boolean("company_anonymous").notNull().default(false),
    /** The employer's logo at its source (ADR-025), "" when none is known. */
    companyLogoUrl: text("company_logo_url").notNull().default(""),
    department: text("department").notNull().default(""),
    locationLabel: text("location_label").notNull().default(""),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    remote: boolean("remote").notNull().default(false),
    contractType: text("contract_type").notNull().default("unknown"),
    salaryLabel: text("salary_label").notNull().default(""),
    description: text("description").notNull().default(""),
    /** 64-bit simhash of the description, as hexadecimal. */
    descriptionSimhash: text("description_simhash").notNull().default(""),
    /** Preferably the employer's own application page. */
    primaryUrl: text("primary_url").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set only once every advert of this job is closed. */
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** The ROME job, from the first advert that named one (US-124). */
    romeCode: text("rome_code"),
    romeCompetences: jsonb("rome_competences")
      .$type<ListingCompetence[]>()
      .notNull()
      .default([]),
  },
  (table) => [
    // The fuzzy step only ever compares within one company and department.
    index("jobs_company_department_idx").on(table.companyKey, table.department),
    index("jobs_rome_code_idx").on(table.romeCode),
    index("jobs_open_idx").on(table.closedAt, table.firstSeenAt),
    index("jobs_title_key_idx").on(table.titleKey),
  ],
);

/**
 * One advert, as a single source publishes it.
 *
 * Kept per source rather than merged away: each one carries its own link, and
 * the card shows them all ("Disponible sur : …"). `match_method` records how
 * the advert was attached, so a wrong merge can be found and undone.
 */
export const jobListings = pgTable(
  "job_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull().default(""),
    applyUrl: text("apply_url").notNull().default(""),
    title: text("title").notNull(),
    companyName: text("company_name").notNull().default(""),
    companyAnonymous: boolean("company_anonymous").notNull().default(false),
    locationLabel: text("location_label").notNull().default(""),
    department: text("department").notNull().default(""),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    remote: boolean("remote").notNull().default(false),
    contractType: text("contract_type").notNull().default("unknown"),
    salaryLabel: text("salary_label").notNull().default(""),
    description: text("description").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    matchMethod: text("match_method").notNull().default("new"),
    romeCode: text("rome_code"),
    /** The appellation's label: offers never give its code. */
    romeAppellation: text("rome_appellation"),
    romeCompetences: jsonb("rome_competences")
      .$type<ListingCompetence[]>()
      .notNull()
      .default([]),
    raw: jsonb("raw"),
  },
  (table) => [
    uniqueIndex("job_listings_source_external_idx").on(
      table.source,
      table.externalId,
    ),
    index("job_listings_job_idx").on(table.jobId),
    check(
      "job_listings_match_method_valid",
      sql`${table.matchMethod} in ('new', 'url', 'strict_key', 'fuzzy', 'manual')`,
    ),
  ],
);

/**
 * Every link that leads to a job, including the partner links France Travail
 * publishes for offers it did not originate.
 *
 * This is the certain half of deduplication: two adverts sharing a link are
 * the same offer, no judgement needed. The unique key makes that lookup a
 * single indexed read.
 */
export const jobLinks = pgTable(
  "job_links",
  {
    urlKey: text("url_key").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("job_links_job_idx").on(table.jobId)],
);
