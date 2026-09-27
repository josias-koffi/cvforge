import { and, count, eq, sql } from "drizzle-orm";
import type { AcquisitionStep, AcquisitionTool, MetricsBucket } from "@cvforge/types";
import type { Database } from "../../database/database.types";
import {
  acquisitionEvents,
  applications,
  atsScans,
  authAccounts,
  searchProjects,
} from "../../database/schema";
import { bucketOf, dayInRange, inRange, toNumber } from "../shared/metrics-sql";
import type { Range } from "../shared/metrics-window";

/** The free tools whose link writes a search rather than a record of its own. */
export type SearchLeadTool = "job_market" | "company_check";

export type AcquisitionStepCount = {
  tool: AcquisitionTool;
  step: AcquisitionStep;
  visitors: number;
};

/** The landing's free tools, from first view to an activated account (US-131). */
export class PgAcquisitionMetricsStore {
  constructor(private readonly db: Database) {}

  /**
   * One row per visitor, step and day is guaranteed by the table's unique
   * index, so a plain count is already a count of daily visitors.
   */
  async readSteps(range: Range): Promise<AcquisitionStepCount[]> {
    const rows = await this.db
      .select({ step: acquisitionEvents.step, tool: acquisitionEvents.tool, visitors: count() })
      .from(acquisitionEvents)
      .where(dayInRange(acquisitionEvents.day, range))
      .groupBy(acquisitionEvents.tool, acquisitionEvents.step);

    return rows.map((row) => ({ ...row, visitors: toNumber(row.visitors) }));
  }

  /** Daily visitors of each tool's first step. */
  async readViewSeries(range: Range, bucket: MetricsBucket) {
    const date = bucketOf(acquisitionEvents.day, bucket, "date");
    const rows = await this.db
      .select({ date, tool: acquisitionEvents.tool, visitors: count() })
      .from(acquisitionEvents)
      .where(and(eq(acquisitionEvents.step, "view"), dayInRange(acquisitionEvents.day, range)))
      .groupBy(date, acquisitionEvents.tool);

    return rows.map((row) => ({ ...row, visitors: toNumber(row.visitors) }));
  }

  /** Addresses that unlocked a public scan in the range and now have an account. */
  async readAtsActivations(range: Range): Promise<number> {
    const [row] = await this.db
      .select({ activated: sql<string>`count(distinct ${atsScans.email})` })
      .from(atsScans)
      .innerJoin(authAccounts, eq(authAccounts.email, atsScans.email))
      .where(and(eq(atsScans.source, "public"), inRange(atsScans.unlockedAt, range)));

    return toNumber(row?.activated);
  }

  /**
   * The comparator and the interview questions keep no address of their own:
   * an account counts as activated once its link created the offered
   * application, labelled with the tool (US-136, US-141).
   */
  async readOfferLeadActivations(sourceLabel: string, range: Range): Promise<number> {
    const [row] = await this.db
      .select({ activated: sql<string>`count(distinct ${applications.userEmail})` })
      .from(applications)
      .where(and(eq(applications.sourceLabel, sourceLabel), inRange(applications.createdAt, range)));

    return toNumber(row?.activated);
  }

  /** The job market (US-137) and employer check (US-139) write a search. */
  async readSearchLeadActivations(tool: SearchLeadTool, range: Range): Promise<number> {
    const [row] = await this.db
      .select({ activated: sql<string>`count(distinct ${searchProjects.userEmail})` })
      .from(searchProjects)
      .where(and(eq(searchProjects.leadOrigin, tool), inRange(searchProjects.leadOriginAt, range)));

    return toNumber(row?.activated);
  }

  /** Public scans run in the range, and how many were unlocked by an email. */
  async readPublicAts(range: Range) {
    const [row] = await this.db
      .select({ scans: count(), unlocked: sql<string>`count(${atsScans.unlockedAt})` })
      .from(atsScans)
      .where(and(eq(atsScans.source, "public"), inRange(atsScans.createdAt, range)));

    return { scans: toNumber(row?.scans), unlocked: toNumber(row?.unlocked) };
  }
}
