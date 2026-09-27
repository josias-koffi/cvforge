import { and, count, countDistinct, eq, sql, sum } from "drizzle-orm";
import type { MetricsBucket } from "@cvforge/types";
import type { Database } from "../../database/database.types";
import {
  authAccounts,
  creditLedgerEntries,
  creditOrders,
} from "../../database/schema";
import { bucketOf, inRange, toNumber } from "../shared/metrics-sql";
import type { Range } from "../shared/metrics-window";
import type { BucketValue } from "../shared/time-series";

export type SalesTotals = {
  revenueCents: number;
  orders: number;
  buyers: number;
  credits: number;
};

const paid = eq(creditOrders.status, "paid");

/** Money in: credit orders, the ledger's grants, and who converts. */
export class PgRevenueStore {
  constructor(private readonly db: Database) {}

  /** Paid orders, dated by payment rather than by checkout. */
  async readSales(range: Range): Promise<SalesTotals> {
    const [row] = await this.db
      .select({
        buyers: countDistinct(creditOrders.userEmail),
        credits: sum(creditOrders.credits),
        orders: count(),
        revenueCents: sum(creditOrders.priceCents),
      })
      .from(creditOrders)
      .where(and(paid, inRange(creditOrders.paidAt, range)));

    return {
      buyers: toNumber(row?.buyers),
      credits: toNumber(row?.credits),
      orders: toNumber(row?.orders),
      revenueCents: toNumber(row?.revenueCents),
    };
  }

  async readSalesSeries(range: Range, bucket: MetricsBucket) {
    const date = bucketOf(creditOrders.paidAt, bucket);
    const rows = await this.db
      .select({ date, orders: count(), revenueCents: sum(creditOrders.priceCents) })
      .from(creditOrders)
      .where(and(paid, inRange(creditOrders.paidAt, range)))
      .groupBy(date);

    return {
      orders: rows.map((row) => ({ date: row.date, value: toNumber(row.orders) })),
      revenueCents: rows.map((row) => ({
        date: row.date,
        value: toNumber(row.revenueCents),
      })),
    } satisfies Record<string, BucketValue[]>;
  }

  /** Accounts whose very first paid order falls in the range. */
  async readNewBuyers(range: Range): Promise<number> {
    const firsts = this.db
      .select({ firstPaidAt: sql`min(${creditOrders.paidAt})`.as("first_paid_at") })
      .from(creditOrders)
      .where(paid)
      .groupBy(creditOrders.userEmail)
      .as("firsts");
    const [row] = await this.db
      .select({ buyers: count() })
      .from(firsts)
      .where(
        and(
          range.from ? sql`${firsts.firstPaidAt} >= ${range.from}` : undefined,
          range.to ? sql`${firsts.firstPaidAt} < ${range.to}` : undefined,
        ),
      );

    return toNumber(row?.buyers);
  }

  /** Of every account that ever paid, how many paid more than once. */
  async readRepeatBuyers(): Promise<{ buyers: number; repeat: number }> {
    const perBuyer = this.db
      .select({ orders: count().as("orders") })
      .from(creditOrders)
      .where(paid)
      .groupBy(creditOrders.userEmail)
      .as("per_buyer");
    const [row] = await this.db
      .select({
        buyers: count(),
        repeat: sql<string>`count(*) filter (where ${perBuyer.orders} >= 2)`,
      })
      .from(perBuyer);

    return { buyers: toNumber(row?.buyers), repeat: toNumber(row?.repeat) };
  }

  /** Median days from signup to a first purchase made in the range. */
  async readMedianDaysToFirstPurchase(range: Range): Promise<number | null> {
    const firsts = this.db
      .select({
        email: creditOrders.userEmail,
        firstPaidAt: sql`min(${creditOrders.paidAt})`.as("first_paid_at"),
      })
      .from(creditOrders)
      .where(paid)
      .groupBy(creditOrders.userEmail)
      .as("firsts");
    const [row] = await this.db
      .select({
        median: sql<string | null>`percentile_cont(0.5) within group (order by extract(epoch from (${firsts.firstPaidAt} - ${authAccounts.createdAt})) / 86400)`,
      })
      .from(firsts)
      .innerJoin(authAccounts, eq(authAccounts.email, firsts.email))
      .where(
        and(
          range.from ? sql`${firsts.firstPaidAt} >= ${range.from}` : undefined,
          range.to ? sql`${firsts.firstPaidAt} < ${range.to}` : undefined,
        ),
      );

    return row?.median === null || row?.median === undefined
      ? null
      : Math.round(toNumber(row.median) * 10) / 10;
  }

  /** Checkouts opened in the range, and how many ended failed or expired. */
  async readCheckouts(range: Range) {
    const [row] = await this.db
      .select({
        abandoned: sql<string>`count(*) filter (where ${creditOrders.status} in ('failed', 'expired'))`,
        opened: count(),
      })
      .from(creditOrders)
      .where(inRange(creditOrders.createdAt, range));

    return { abandoned: toNumber(row?.abandoned), opened: toNumber(row?.opened) };
  }

  /**
   * Accounts created in the range, followed down the path to paying twice.
   * Correlated subqueries keep it one scan of the accounts: the tables they
   * probe are indexed on the user's email.
   */
  async readFunnel(range: Range) {
    const hasGenerated = sql`exists (select 1 from ${creditLedgerEntries} where ${creditLedgerEntries.userEmail} = ${authAccounts.email} and ${creditLedgerEntries.type} = 'ai_usage')`;
    const paidOrders = sql`(select count(*) from ${creditOrders} where ${creditOrders.userEmail} = ${authAccounts.email} and ${creditOrders.status} = 'paid')`;
    const [row] = await this.db
      .select({
        firstGeneration: sql<string>`count(*) filter (where ${hasGenerated})`,
        firstPurchase: sql<string>`count(*) filter (where ${paidOrders} >= 1)`,
        onboarded: sql<string>`count(${authAccounts.onboardingCompletedAt})`,
        repeatPurchase: sql<string>`count(*) filter (where ${paidOrders} >= 2)`,
        signups: count(),
      })
      .from(authAccounts)
      .where(inRange(authAccounts.createdAt, range));

    return {
      firstGeneration: toNumber(row?.firstGeneration),
      firstPurchase: toNumber(row?.firstPurchase),
      onboarded: toNumber(row?.onboarded),
      repeatPurchase: toNumber(row?.repeatPurchase),
      signups: toNumber(row?.signups),
    };
  }

  /** Sales per pack, named as the buyer saw it (French label first). */
  async readOfferSales(range: Range) {
    const offerName = sql<string>`coalesce(${creditOrders.offerName}->>'fr', ${creditOrders.offerName}->>'en', '—')`;
    const rows = await this.db
      .select({
        credits: sum(creditOrders.credits),
        offerName,
        orders: count(),
        revenueCents: sum(creditOrders.priceCents),
      })
      .from(creditOrders)
      .where(and(paid, inRange(creditOrders.paidAt, range)))
      .groupBy(offerName)
      .orderBy(sql`sum(${creditOrders.priceCents}) desc`);

    return rows.map((row) => ({
      credits: toNumber(row.credits),
      offerName: row.offerName,
      orders: toNumber(row.orders),
      revenueCents: toNumber(row.revenueCents),
    }));
  }

  /** Credits in and out of the ledger over the range, by kind. */
  async readCredits(range: Range) {
    const rows = await this.db
      .select({ credits: sum(creditLedgerEntries.amount), type: creditLedgerEntries.type })
      .from(creditLedgerEntries)
      .where(inRange(creditLedgerEntries.createdAt, range))
      .groupBy(creditLedgerEntries.type);
    const of = (type: string) =>
      toNumber(rows.find((row) => row.type === type)?.credits);

    return {
      consumed: Math.abs(of("ai_usage")),
      granted: of("admin_grant"),
      sold: of("stripe_purchase"),
      welcome: of("welcome_grant"),
    };
  }

  /** What a credit sold for on average, all time, in EUR cents. */
  async readCreditValueCents(): Promise<number | null> {
    const totals = await this.readSales({ from: null, to: null });

    return totals.credits > 0 ? totals.revenueCents / totals.credits : null;
  }
}
