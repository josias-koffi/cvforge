import { and, count, eq, gte, isNotNull, sql, sum } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import type { Database } from "../database/database.types";
import {
  applicationCvVersions,
  applications,
  atsScans,
  authAccounts,
  creditLedgerEntries,
  creditOrders,
  interviewSessions,
} from "../database/schema";
import type { AtsCounters, MetricsStore, ProductCounters } from "./metrics.types";

const MS_PER_DAY = 86_400_000;

/** `sum()` answers a numeric string, or null on an empty set. */
function toNumber(value: string | number | null): number {
  if (value === null) {
    return 0;
  }

  return typeof value === "number" ? value : Number.parseFloat(value) || 0;
}

/**
 * The first SQL aggregates in this codebase — every other store reads rows and
 * reduces in JS. Counting documents or revenue that way would mean loading the
 * whole table into the API process, so these stay in the database.
 */
export class PgMetricsStore implements MetricsStore {
  constructor(private readonly db: Database) {}

  async readProductCounters(activeWindowDays: number): Promise<ProductCounters> {
    const activeSince = new Date(Date.now() - activeWindowDays * MS_PER_DAY);

    const [
      ledgerByAction,
      ledgerByType,
      interviews,
      accounts,
      applicationCount,
      revenue,
      activeEmails,
    ] = await Promise.all([
      this.db
        .select({ action: creditLedgerEntries.action, entries: count() })
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.type, "ai_usage"))
        .groupBy(creditLedgerEntries.action),
      this.db
        .select({ credits: sum(creditLedgerEntries.amount), type: creditLedgerEntries.type })
        .from(creditLedgerEntries)
        .groupBy(creditLedgerEntries.type),
      this.db
        .select({
          completed: sql<number>`count(*) filter (where ${interviewSessions.status} = 'completed')`,
          total: count(),
        })
        .from(interviewSessions),
      this.db
        .select({
          admins: sql<number>`count(*) filter (where ${authAccounts.role} = 'admin')`,
          total: count(),
        })
        .from(authAccounts),
      this.db.select({ total: count() }).from(applications),
      this.db
        .select({ grossCents: sum(creditOrders.priceCents), paidOrders: count() })
        .from(creditOrders)
        .where(eq(creditOrders.status, "paid")),
      // "Active" means the account actually used the product in the window:
      // there is no last-login column, and a login alone is not usage.
      // `union` deduplicates, and the result is one row per active account.
      union(
        this.db
          .selectDistinct({ email: applications.userEmail })
          .from(applications)
          .where(gte(applications.createdAt, activeSince)),
        this.db
          .selectDistinct({ email: creditLedgerEntries.userEmail })
          .from(creditLedgerEntries)
          .where(
            and(
              gte(creditLedgerEntries.createdAt, activeSince),
              eq(creditLedgerEntries.type, "ai_usage"),
            ),
          ),
      ),
    ]);

    const entriesFor = (action: string) =>
      Number(ledgerByAction.find((row) => row.action === action)?.entries ?? 0);
    const creditsFor = (type: string) =>
      toNumber(ledgerByType.find((row) => row.type === type)?.credits ?? null);

    return {
      activeUserCount: activeEmails.length,
      applicationCount: Number(applicationCount[0]?.total ?? 0),
      creditsConsumed: Math.abs(creditsFor("ai_usage")),
      creditsGranted: creditsFor("admin_grant"),
      creditsSold: creditsFor("stripe_purchase"),
      cvImportCount: entriesFor("cv_import"),
      generatedCvCount: entriesFor("cv_generation"),
      generatedLetterCount: entriesFor("letter_generation"),
      grossRevenueCents: toNumber(revenue[0]?.grossCents ?? null),
      interviewCompletedCount: Number(interviews[0]?.completed ?? 0),
      interviewCount: Number(interviews[0]?.total ?? 0),
      offerEnrichmentCount: entriesFor("offer_enrichment"),
      paidOrderCount: Number(revenue[0]?.paidOrders ?? 0),
      totalAdminCount: Number(accounts[0]?.admins ?? 0),
      totalUserCount: Number(accounts[0]?.total ?? 0),
    };
  }

  /**
   * The ATS funnel and the score averages.
   *
   * Averages are grouped by `ats_engine_version` because the scale is
   * versioned: pooling 1.0.0 and 1.1.0 would measure the rescale rather than
   * the CVs. Unscored versions are excluded by the `is not null`, so a CV
   * generated before the feature never counts as a zero.
   */
  async readAtsCounters(): Promise<AtsCounters> {
    const [scoresByEngine, [scanTotals], [converted]] = await Promise.all([
      this.db
        .select({
          averageScore: sql<string>`avg(${applicationCvVersions.atsScore})`,
          engineVersion: sql<string>`coalesce(${applicationCvVersions.atsEngineVersion}, 'unknown')`,
          scoredCvCount: count(),
        })
        .from(applicationCvVersions)
        .where(isNotNull(applicationCvVersions.atsScore))
        .groupBy(applicationCvVersions.atsEngineVersion),
      this.db
        .select({
          publicScanCount: count(),
          unlockedScanCount: sql<string>`count(${atsScans.unlockedAt})`,
        })
        .from(atsScans)
        .where(eq(atsScans.source, "public")),
      // A lead counts as converted once its address has an account — the join
      // is made at read time, so neither side owns the other.
      this.db
        .select({ convertedLeadCount: sql<string>`count(distinct ${atsScans.email})` })
        .from(atsScans)
        .innerJoin(authAccounts, eq(authAccounts.email, atsScans.email)),
    ]);

    return {
      convertedLeadCount: toNumber(converted?.convertedLeadCount ?? 0),
      publicScanCount: toNumber(scanTotals?.publicScanCount ?? 0),
      scoresByEngine: scoresByEngine.map((row) => ({
        averageScore: Math.round(toNumber(row.averageScore)),
        engineVersion: row.engineVersion,
        scoredCvCount: toNumber(row.scoredCvCount),
      })),
      unlockedScanCount: toNumber(scanTotals?.unlockedScanCount ?? 0),
    };
  }
}
