import { and, count, eq, sql, sum, type SQL } from "drizzle-orm";
import type { RankedItem } from "@cvforge/types";
import type { Database } from "../../database/database.types";
import {
  applications,
  jobMatches,
  jobs,
  searchProjects,
  toolQueries,
  type ToolQueryTool,
} from "../../database/schema";
import { dayInRange, inRange, toNumber } from "../shared/metrics-sql";
import type { Range } from "../shared/metrics-window";

/** Entries per ranking: enough to see a trend, short enough to read. */
export const TOP_LIMIT = 10;

type RankRow = { label: string | null; count: string | number; detail?: string | null };

function toRanked(rows: RankRow[]): RankedItem[] {
  return rows
    .filter((row) => row.label && row.label.trim().length > 0)
    .map((row) => ({
      count: toNumber(row.count),
      label: row.label as string,
      ...(row.detail ? { detail: row.detail } : {}),
    }));
}

/**
 * What the job market looks like from the platform: the employers and jobs
 * candidates go after, and what visitors look up in the free tools.
 */
export class PgMarketStore {
  constructor(private readonly db: Database) {}

  /**
   * A field of the offers applied to, grouped case- and space-insensitively;
   * the most common spelling is the one shown.
   */
  private async rankApplications(field: "companyName" | "title", range: Range) {
    const value = sql<string>`nullif(btrim(${applications.extracted}->>${field}), '')`;
    const key = sql`lower(${value})`;
    const rows = await this.db
      .select({ count: count(), label: sql<string>`mode() within group (order by ${value})` })
      .from(applications)
      .where(and(sql`${value} is not null`, inRange(applications.createdAt, range)))
      .groupBy(key)
      .orderBy(sql`count(*) desc`)
      .limit(TOP_LIMIT);

    return toRanked(rows);
  }

  readTopCompanies(range: Range) {
    return this.rankApplications("companyName", range);
  }

  readTopJobTitles(range: Range) {
    return this.rankApplications("title", range);
  }

  /**
   * The roles candidates are searching for right now. A search is a standing
   * setting, not an event, so this reads the searches as they stand.
   */
  async readTopTargetRoles() {
    const role = sql<string>`btrim(role)`;
    const rows = await this.db
      .select({ count: count(), label: sql<string>`mode() within group (order by ${role})` })
      .from(
        sql`${searchProjects}, jsonb_array_elements_text(${searchProjects.targetRoles}) as role`,
      )
      .where(sql`${role} <> ''`)
      .groupBy(sql`lower(${role})`)
      .orderBy(sql`count(*) desc`)
      .limit(TOP_LIMIT);

    return toRanked(rows);
  }

  /** The free tools' counters (US-155), summed over the range. */
  private async rankToolQueries(tool: ToolQueryTool, range: Range, withPlace: boolean) {
    const place: SQL<string> = sql`${toolQueries.place}`;
    const rows = await this.db
      .select({
        count: sum(toolQueries.hits),
        detail: withPlace ? place : sql<string>`''`,
        label: sql<string>`max(${toolQueries.label})`,
      })
      .from(toolQueries)
      .where(and(eq(toolQueries.tool, tool), dayInRange(toolQueries.day, range)))
      .groupBy(toolQueries.queryKey, ...(withPlace ? [toolQueries.place] : []))
      .orderBy(sql`sum(${toolQueries.hits}) desc`)
      .limit(TOP_LIMIT);

    return toRanked(rows.map((row) => ({ ...row, count: row.count ?? 0 })));
  }

  readTopCheckedCompanies(range: Range) {
    return this.rankToolQueries("company_check", range, false);
  }

  readTopSearchedJobs(range: Range) {
    return this.rankToolQueries("job_market", range, true);
  }

  /**
   * The morning digest's offers proposed in the range, by what became of
   * them. A status is where the offer stands now, so each later step also
   * counts as the ones before it.
   */
  async readDailyOffers(range: Range) {
    const status = (list: string) =>
      sql<string>`count(*) filter (where ${jobMatches.status} in (${sql.raw(list)}))`;
    const [row] = await this.db
      .select({
        applied: status("'applied'"),
        dismissed: status("'dismissed'"),
        proposed: count(),
        saved: status("'saved', 'applied'"),
        seen: status("'seen', 'saved', 'applied', 'dismissed'"),
      })
      .from(jobMatches)
      .where(inRange(jobMatches.createdAt, range));

    return {
      applied: toNumber(row?.applied),
      dismissed: toNumber(row?.dismissed),
      proposed: toNumber(row?.proposed),
      saved: toNumber(row?.saved),
      seen: toNumber(row?.seen),
    };
  }

  /** Employers of the digest offers candidates applied to; the snapshot outlives the purge. */
  async readTopAppliedCompanies(range: Range) {
    const company = sql<string>`nullif(btrim(coalesce(${jobs.companyName}, ${jobMatches.jobSnapshot}->>'companyName')), '')`;
    const rows = await this.db
      .select({ count: count(), label: sql<string>`mode() within group (order by ${company})` })
      .from(jobMatches)
      .leftJoin(jobs, eq(jobs.id, jobMatches.jobId))
      .where(
        and(
          eq(jobMatches.status, "applied"),
          sql`${company} is not null`,
          inRange(jobMatches.updatedAt, range),
        ),
      )
      .groupBy(sql`lower(${company})`)
      .orderBy(sql`count(*) desc`)
      .limit(TOP_LIMIT);

    return toRanked(rows);
  }
}
