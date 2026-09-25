import { and, count, eq, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import type { MetricsBucket } from "@cvforge/types";
import type { Database } from "../../database/database.types";
import {
  applications,
  authAccounts,
  creditLedgerEntries,
} from "../../database/schema";
import { bucketOf, inRange, toNumber } from "./metrics-sql";
import type { Range } from "./metrics-window";
import type { BucketValue } from "./time-series";

/**
 * Who signed up, and who used the product. Several tabs need both, so they
 * live apart from any one of them.
 *
 * "Active" means the account did something in the range — created an
 * application or spent credits on AI. There is no last-login column, and a
 * login alone is not usage.
 */
export class PgActivityStore {
  constructor(private readonly db: Database) {}

  async readSignups(range: Range): Promise<number> {
    const [row] = await this.db
      .select({ signups: count() })
      .from(authAccounts)
      .where(inRange(authAccounts.createdAt, range));

    return toNumber(row?.signups);
  }

  async readSignupSeries(range: Range, bucket: MetricsBucket): Promise<BucketValue[]> {
    const date = bucketOf(authAccounts.createdAt, bucket);
    const rows = await this.db
      .select({ date, signups: count() })
      .from(authAccounts)
      .where(inRange(authAccounts.createdAt, range))
      .groupBy(date);

    return rows.map((row) => ({ date: row.date, value: toNumber(row.signups) }));
  }

  /** Every usage event of the range: one row per action, with its account. */
  private usage(range: Range) {
    return unionAll(
      this.db
        .select({ at: applications.createdAt, email: applications.userEmail })
        .from(applications)
        .where(inRange(applications.createdAt, range)),
      this.db
        .select({ at: creditLedgerEntries.createdAt, email: creditLedgerEntries.userEmail })
        .from(creditLedgerEntries)
        .where(
          and(
            eq(creditLedgerEntries.type, "ai_usage"),
            inRange(creditLedgerEntries.createdAt, range),
          ),
        ),
    ).as("usage");
  }

  async readActiveUsers(range: Range): Promise<number> {
    const usage = this.usage(range);
    const [row] = await this.db
      .select({ active: sql<string>`count(distinct ${usage.email})` })
      .from(usage);

    return toNumber(row?.active);
  }

  /** Distinct active accounts per bucket: one account counts once per bucket. */
  async readActiveSeries(range: Range, bucket: MetricsBucket): Promise<BucketValue[]> {
    const usage = this.usage(range);
    const date = bucketOf(usage.at, bucket);
    const rows = await this.db
      .select({ active: sql<string>`count(distinct ${usage.email})`, date })
      .from(usage)
      .groupBy(date);

    return rows.map((row) => ({ date: row.date, value: toNumber(row.active) }));
  }
}
