import type { MarketTensionLevel } from "@cvforge/types";
import { and, eq, gte, inArray, ne } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobs, marketDemand, marketStats } from "../database/schema";
import type { MarketReading } from "./market-stats.readings";

/** DI token for the market radar's store. */
export const MARKET_STATS_STORE = Symbol("MARKET_STATS_STORE");

export interface StoredMarketStats extends MarketReading {
  changeNote: string | null;
  changedAt: Date | null;
  refreshedAt: Date;
}

export interface MarketStatsStore {
  find(romeCode: string, department: string): Promise<StoredMarketStats | null>;
  /** When each (job, department) of these jobs was last read, keyed `rome|dep`. */
  refreshedAt(romeCodes: readonly string[]): Promise<Map<string, Date>>;
  /**
   * Replaces a reading. A null change keeps the previous note: the morning
   * e-mail reads notes by date, and a quiet month must not erase last month's.
   */
  save(reading: MarketReading, change: string | null, at: Date): Promise<void>;
  /** Every stored department of these jobs in these regions. */
  listByRegions(
    romeCodes: readonly string[],
    regions: readonly string[],
  ): Promise<StoredMarketStats[]>;
  /** The salary labels of the offers collected for a job in a department. */
  salaryLabels(
    romeCode: string,
    department: string,
    since: Date,
  ): Promise<string[]>;
  /** A visitor asked for a pair never read (US-137): the next refresh reads it. */
  recordDemand(romeCode: string, department: string, at: Date): Promise<void>;
  /** The pairs visitors asked for since this date. */
  listDemand(since: Date): Promise<Array<{ romeCode: string; department: string }>>;
}

export function marketKey(romeCode: string, department: string): string {
  return `${romeCode}|${department}`;
}

type Row = typeof marketStats.$inferSelect;

function figure(value: number | null, period: string | null) {
  return value !== null && period ? { period, value } : null;
}

function toStats(row: Row): StoredMarketStats {
  return {
    changeNote: row.changeNote,
    changedAt: row.changedAt,
    department: row.department,
    jobseekers: figure(row.jobseekersCount, row.jobseekersPeriod),
    offers: figure(row.offersCount, row.offersPeriod),
    offersYear: figure(row.offersYearCount, row.offersPeriod),
    refreshedAt: row.refreshedAt,
    region: row.region,
    romeCode: row.romeCode,
    romeLabel: row.romeLabel,
    salary:
      row.salaryMedianYearly !== null &&
      row.salarySample !== null &&
      row.salaryPeriod
        ? {
            medianYearly: row.salaryMedianYearly,
            period: row.salaryPeriod,
            sample: row.salarySample,
          }
        : null,
    tension:
      row.tensionLevel !== null && row.tensionPeriod
        ? {
            period: row.tensionPeriod,
            value: row.tensionLevel as MarketTensionLevel,
          }
        : null,
  };
}

export class PgMarketStatsStore implements MarketStatsStore {
  constructor(private readonly db: Database) {}

  async find(romeCode: string, department: string) {
    const [row] = await this.db
      .select()
      .from(marketStats)
      .where(
        and(
          eq(marketStats.romeCode, romeCode),
          eq(marketStats.department, department),
        ),
      )
      .limit(1);

    return row ? toStats(row) : null;
  }

  async refreshedAt(romeCodes: readonly string[]) {
    if (romeCodes.length === 0) return new Map<string, Date>();

    const rows = await this.db
      .select({
        department: marketStats.department,
        refreshedAt: marketStats.refreshedAt,
        romeCode: marketStats.romeCode,
      })
      .from(marketStats)
      .where(inArray(marketStats.romeCode, [...romeCodes]));

    return new Map(
      rows.map((row) => [
        marketKey(row.romeCode, row.department),
        row.refreshedAt,
      ]),
    );
  }

  async save(reading: MarketReading, change: string | null, at: Date) {
    const values = {
      department: reading.department,
      jobseekersCount: reading.jobseekers?.value ?? null,
      jobseekersPeriod: reading.jobseekers?.period ?? null,
      offersCount: reading.offers?.value ?? null,
      // Both counts end with the same quarter: one period says it for both.
      offersPeriod: reading.offers?.period ?? reading.offersYear?.period ?? null,
      offersYearCount: reading.offersYear?.value ?? null,
      refreshedAt: at,
      region: reading.region,
      romeCode: reading.romeCode,
      romeLabel: reading.romeLabel,
      salaryMedianYearly: reading.salary?.medianYearly ?? null,
      salaryPeriod: reading.salary?.period ?? null,
      salarySample: reading.salary?.sample ?? null,
      tensionLevel: reading.tension?.value ?? null,
      tensionPeriod: reading.tension?.period ?? null,
      ...(change ? { changeNote: change, changedAt: at } : {}),
    };

    await this.db
      .insert(marketStats)
      .values(values)
      .onConflictDoUpdate({
        set: values,
        target: [marketStats.romeCode, marketStats.department],
      });
  }

  async listByRegions(romeCodes: readonly string[], regions: readonly string[]) {
    if (romeCodes.length === 0 || regions.length === 0) return [];

    const rows = await this.db
      .select()
      .from(marketStats)
      .where(
        and(
          inArray(marketStats.romeCode, [...romeCodes]),
          inArray(marketStats.region, [...regions]),
        ),
      );

    return rows.map(toStats);
  }

  async salaryLabels(romeCode: string, department: string, since: Date) {
    const rows = await this.db
      .select({ label: jobs.salaryLabel })
      .from(jobs)
      .where(
        and(
          eq(jobs.romeCode, romeCode),
          eq(jobs.department, department),
          ne(jobs.salaryLabel, ""),
          // Closed or not: an offer still said what it paid while open.
          gte(jobs.firstSeenAt, since),
        ),
      );

    return rows.map((row) => row.label);
  }

  async recordDemand(romeCode: string, department: string, at: Date) {
    await this.db
      .insert(marketDemand)
      .values({ department, requestedAt: at, romeCode })
      .onConflictDoUpdate({
        set: { requestedAt: at },
        target: [marketDemand.romeCode, marketDemand.department],
      });
  }

  async listDemand(since: Date) {
    return this.db
      .select({
        department: marketDemand.department,
        romeCode: marketDemand.romeCode,
      })
      .from(marketDemand)
      .where(gte(marketDemand.requestedAt, since));
  }
}
