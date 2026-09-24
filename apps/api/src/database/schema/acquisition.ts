import type { AcquisitionStep, AcquisitionTool } from "@cvforge/types";
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The funnel of the landing's free tools (US-131): one row per visitor, per
 * day, per step of a tool.
 *
 * Nothing here identifies anyone. `ip_hash` is salted with the day as well as
 * the secret, so the same visitor hashes differently tomorrow and cannot be
 * followed from one day to the next. There is no email and no free text; the
 * values are closed lists checked by the service. That is what lets this
 * measure the audience without a cookie or a consent banner.
 */
export const acquisitionEvents = pgTable(
  "acquisition_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    day: date("day").notNull(),
    tool: text("tool").$type<AcquisitionTool>().notNull(),
    step: text("step").$type<AcquisitionStep>().notNull(),
    locale: text("locale").notNull(),
    /** sha256(day + ip + secret). Changes every day, by design. */
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // A visitor counts once per step and per day, whatever they reload; this
    // is also what bounds how much a single address can write.
    uniqueIndex("acquisition_events_visitor_idx").on(
      table.day,
      table.tool,
      table.step,
      table.ipHash,
    ),
    index("acquisition_events_day_idx").on(table.day),
    check(
      "acquisition_events_step_valid",
      sql`${table.step} in ('view', 'result', 'cta_click', 'email_submitted')`,
    ),
  ],
);
