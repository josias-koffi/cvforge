import type { AnthropicCreditSummary } from "@cvforge/types";
import { and, eq, gte, sum } from "drizzle-orm";
import type { Database } from "../../database/database.types";
import { aiProviderBalances, aiUsageEvents } from "../../database/schema";

const PROVIDER = "anthropic";

/**
 * The Claude balance last typed in by the admin, counted down by the calls
 * recorded since. An estimate: a standard API key cannot read the real one.
 */
export class PgAnthropicCreditStore {
  constructor(private readonly db: Database) {}

  async readSummary(): Promise<AnthropicCreditSummary | null> {
    const [balance] = await this.db
      .select()
      .from(aiProviderBalances)
      .where(eq(aiProviderBalances.provider, PROVIDER))
      .limit(1);
    if (!balance) return null;

    const [spend] = await this.db
      .select({ costUsd: sum(aiUsageEvents.costUsd) })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.provider, PROVIDER),
          gte(aiUsageEvents.createdAt, balance.recordedAt),
        ),
      );
    const spentUsd = Number(spend?.costUsd ?? 0);

    return {
      recordedAt: balance.recordedAt.toISOString(),
      recordedUsd: balance.balanceUsd,
      remainingUsd: Math.max(balance.balanceUsd - spentUsd, 0),
      spentUsd,
    };
  }

  async save(balanceUsd: number) {
    const values = { balanceUsd, recordedAt: new Date() };

    await this.db
      .insert(aiProviderBalances)
      .values({ provider: PROVIDER, ...values })
      .onConflictDoUpdate({ set: values, target: aiProviderBalances.provider });
  }

  async clear() {
    await this.db.delete(aiProviderBalances).where(eq(aiProviderBalances.provider, PROVIDER));
  }
}
