import { and, avg, count, eq, min, sql, sum } from "drizzle-orm";
import type { AiFeature, MetricsBucket } from "@cvforge/types";
import type { Database } from "../../database/database.types";
import { aiUsageEvents, creditLedgerEntries } from "../../database/schema";
import { bucketOf, inRange, toNumber } from "../shared/metrics-sql";
import type { Range } from "../shared/metrics-window";

export type AiCostTotals = { calls: number; costUsd: number; errors: number };

const errorCount = sql<string>`count(*) filter (where ${aiUsageEvents.status} = 'error')`;

/** What the AI calls cost (US-154), and the credits the ledger charged for them. */
export class PgAiCostsStore {
  constructor(private readonly db: Database) {}

  async readTotals(range: Range): Promise<AiCostTotals> {
    const [row] = await this.db
      .select({ calls: count(), costUsd: sum(aiUsageEvents.costUsd), errors: errorCount })
      .from(aiUsageEvents)
      .where(inRange(aiUsageEvents.createdAt, range));

    return {
      calls: toNumber(row?.calls),
      costUsd: toNumber(row?.costUsd),
      errors: toNumber(row?.errors),
    };
  }

  /** Cost per bucket and per feature, in USD. */
  async readSeries(range: Range, bucket: MetricsBucket) {
    const date = bucketOf(aiUsageEvents.createdAt, bucket);
    const rows = await this.db
      .select({ costUsd: sum(aiUsageEvents.costUsd), date, feature: aiUsageEvents.feature })
      .from(aiUsageEvents)
      .where(inRange(aiUsageEvents.createdAt, range))
      .groupBy(date, aiUsageEvents.feature);

    return rows.map((row) => ({
      costUsd: toNumber(row.costUsd),
      date: row.date,
      feature: row.feature,
    }));
  }

  async readByFeature(range: Range) {
    const rows = await this.db
      .select({
        calls: count(),
        completionTokens: sum(aiUsageEvents.completionTokens),
        costUsd: sum(aiUsageEvents.costUsd),
        errors: errorCount,
        feature: aiUsageEvents.feature,
        promptTokens: sum(aiUsageEvents.promptTokens),
      })
      .from(aiUsageEvents)
      .where(inRange(aiUsageEvents.createdAt, range))
      .groupBy(aiUsageEvents.feature)
      .orderBy(sql`sum(${aiUsageEvents.costUsd}) desc`);

    return rows.map((row) => ({
      calls: toNumber(row.calls),
      completionTokens: toNumber(row.completionTokens),
      costUsd: toNumber(row.costUsd),
      errors: toNumber(row.errors),
      feature: row.feature as AiFeature,
      promptTokens: toNumber(row.promptTokens),
    }));
  }

  async readByModel(range: Range) {
    const rows = await this.db
      .select({
        averageDurationMs: avg(aiUsageEvents.durationMs),
        calls: count(),
        completionTokens: sum(aiUsageEvents.completionTokens),
        costUsd: sum(aiUsageEvents.costUsd),
        errors: errorCount,
        fallbacks: sql<string>`count(*) filter (where ${aiUsageEvents.fellBack})`,
        model: aiUsageEvents.model,
        promptTokens: sum(aiUsageEvents.promptTokens),
      })
      .from(aiUsageEvents)
      .where(inRange(aiUsageEvents.createdAt, range))
      .groupBy(aiUsageEvents.model)
      .orderBy(sql`sum(${aiUsageEvents.costUsd}) desc`);

    return rows.map((row) => ({
      averageDurationMs: Math.round(toNumber(row.averageDurationMs)),
      calls: toNumber(row.calls),
      completionTokens: toNumber(row.completionTokens),
      costUsd: toNumber(row.costUsd),
      errors: toNumber(row.errors),
      fallbacks: toNumber(row.fallbacks),
      model: row.model,
      promptTokens: toNumber(row.promptTokens),
    }));
  }

  /** The first call ever recorded: costs before it were never measured. */
  async readTrackingSince(): Promise<Date | null> {
    const [row] = await this.db
      .select({ first: min(aiUsageEvents.createdAt) })
      .from(aiUsageEvents);

    return row?.first ?? null;
  }

  /** Credits the ledger charged per AI action over the range. */
  async readCreditsCharged(range: Range): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ action: creditLedgerEntries.action, credits: sum(creditLedgerEntries.amount) })
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.type, "ai_usage"),
          inRange(creditLedgerEntries.createdAt, range),
        ),
      )
      .groupBy(creditLedgerEntries.action);

    return Object.fromEntries(
      rows.map((row) => [row.action, Math.abs(toNumber(row.credits))]),
    );
  }
}
