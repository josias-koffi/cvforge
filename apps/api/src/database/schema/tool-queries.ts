import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** The free tools whose searches are worth ranking in the cockpit. */
export type ToolQueryTool = "company_check" | "job_market";

/**
 * What visitors look up in the landing's free tools (US-155), counted per day.
 *
 * A counter, not a log: one row per day, tool and thing searched, whose `hits`
 * goes up. No address, no hash, no email — the question the cockpit asks is
 * "which employers and which jobs do people check", never "who checked".
 */
export const toolQueries = pgTable(
  "tool_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    day: date("day").notNull(),
    tool: text("tool").$type<ToolQueryTool>().notNull(),
    /** The SIREN, or the ROME appellation code. */
    queryKey: text("query_key").notNull(),
    /** The company's legal name, or the job's label, as shown in the tool. */
    label: text("label").notNull(),
    /**
     * The department searched with a job; "" for a company. Not nullable:
     * the unique index would count every null as distinct.
     */
    place: text("place").notNull().default(""),
    hits: integer("hits").notNull().default(1),
  },
  (table) => [
    uniqueIndex("tool_queries_day_key_idx").on(
      table.day,
      table.tool,
      table.queryKey,
      table.place,
    ),
    index("tool_queries_day_idx").on(table.day),
    check(
      "tool_queries_tool_valid",
      sql`${table.tool} in ('company_check', 'job_market')`,
    ),
  ],
);
