import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import type { Database } from "../database/database.types";
import { PgAcquisitionMetricsStore } from "./acquisition/acquisition.pg-store";
import { AcquisitionMetricsService } from "./acquisition/acquisition.service";
import { PgAiCostsStore } from "./ai-costs/ai-costs.pg-store";
import { AiCostMetricsService } from "./ai-costs/ai-costs.service";
import { PgMarketStore } from "./market/market.pg-store";
import { MarketMetricsService } from "./market/market.service";
import type { CockpitSnapshot } from "./metrics-csv";
import { OverviewMetricsService } from "./overview/overview.service";
import { PgRevenueStore } from "./revenue/revenue.pg-store";
import { RevenueMetricsService } from "./revenue/revenue.service";
import { PgActivityStore } from "./shared/activity.pg-store";
import type { ResolvedWindow } from "./shared/metrics-window";
import { PgUsageStore } from "./usage/usage.pg-store";
import { UsageMetricsService } from "./usage/usage.service";

type BalanceReader = Pick<OpenRouterBalanceService, "getBalance" | "isEnabled">;

/**
 * Wires the cockpit's tabs once: each owns its store and its service, and the
 * overview reads through the others rather than repeating their SQL.
 */
export class CockpitService {
  readonly overview: OverviewMetricsService;
  readonly revenue: RevenueMetricsService;
  readonly aiCosts: AiCostMetricsService;
  readonly usage: UsageMetricsService;
  readonly market: MarketMetricsService;
  readonly acquisition: AcquisitionMetricsService;

  constructor(db: Database, balance: BalanceReader, usdToEurRate: number) {
    const activity = new PgActivityStore(db);
    const revenueStore = new PgRevenueStore(db);
    const aiCostsStore = new PgAiCostsStore(db);

    this.revenue = new RevenueMetricsService(revenueStore, activity);
    this.aiCosts = new AiCostMetricsService(aiCostsStore, revenueStore, balance, usdToEurRate);
    this.usage = new UsageMetricsService(new PgUsageStore(db));
    this.market = new MarketMetricsService(new PgMarketStore(db));
    this.acquisition = new AcquisitionMetricsService(new PgAcquisitionMetricsStore(db));
    this.overview = new OverviewMetricsService({
      acquisition: this.acquisition,
      activity,
      aiCosts: this.aiCosts,
      aiCostsStore,
      revenue: revenueStore,
      usdToEurRate,
    });
  }

  /** Every tab over the same window, for the CSV export. */
  async snapshot(window: ResolvedWindow): Promise<CockpitSnapshot> {
    const [overview, revenue, aiCosts, usage, market, acquisition] = await Promise.all([
      this.overview.read(window),
      this.revenue.read(window),
      this.aiCosts.read(window),
      this.usage.read(window),
      this.market.read(window),
      this.acquisition.read(window),
    ]);

    return { acquisition, aiCosts, market, overview, revenue, usage };
  }
}
