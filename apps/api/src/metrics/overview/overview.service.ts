import type { Kpi, OverviewMetrics } from "@cvforge/types";
import type { AcquisitionMetricsService } from "../acquisition/acquisition.service";
import type { AiCostMetricsService } from "../ai-costs/ai-costs.service";
import type { PgAiCostsStore } from "../ai-costs/ai-costs.pg-store";
import type { PgRevenueStore } from "../revenue/revenue.pg-store";
import type { PgActivityStore } from "../shared/activity.pg-store";
import { readKpi, toWindowDto, type ResolvedWindow } from "../shared/metrics-window";
import { bucketDates, fillSeries, oldestDate } from "../shared/time-series";
import { buildInsights } from "./insights";

export type OverviewDeps = {
  activity: PgActivityStore;
  revenue: Pick<PgRevenueStore, "readSales" | "readSalesSeries" | "readNewBuyers" | "readFunnel">;
  aiCostsStore: Pick<PgAiCostsStore, "readTotals" | "readSeries">;
  aiCosts: Pick<AiCostMetricsService, "read">;
  acquisition: Pick<AcquisitionMetricsService, "read">;
  usdToEurRate: number;
};

/**
 * The cockpit's first tab: the few figures that say how the business is
 * doing, and the findings the other tabs explain.
 */
export class OverviewMetricsService {
  constructor(private readonly deps: OverviewDeps) {}

  async read(window: ResolvedWindow): Promise<OverviewMetrics> {
    const { activity, revenue } = this.deps;
    const [money, signups, activeUsers, newBuyers, series, aiCosts, funnel, acquisition] =
      await Promise.all([
        this.readMoney(window),
        readKpi(window, (range) => activity.readSignups(range)),
        readKpi(window, (range) => activity.readActiveUsers(range)),
        readKpi(window, (range) => revenue.readNewBuyers(range)),
        this.readSeries(window),
        this.deps.aiCosts.read(window),
        revenue.readFunnel(window.current),
        this.deps.acquisition.read(window),
      ]);
    const kpis = { ...money, activeUsers, newBuyers, signups };

    return {
      ...series,
      insights: buildInsights({
        acquisition: acquisition.funnels,
        aiCosts,
        funnel,
        kpis,
      }),
      kpis,
      window: toWindowDto(window),
    };
  }

  /** Revenue, AI cost in EUR, and what is left of one after the other. */
  private async readMoney(window: ResolvedWindow) {
    const toCents = (usd: number) => Math.round(usd * this.deps.usdToEurRate * 100);
    const [revenueCents, aiCostEurCents] = await Promise.all([
      readKpi(window, async (range) => (await this.deps.revenue.readSales(range)).revenueCents),
      readKpi(window, async (range) =>
        toCents((await this.deps.aiCostsStore.readTotals(range)).costUsd),
      ),
    ]);
    const margin = (revenue: number | null, cost: number | null) =>
      revenue === null || cost === null ? null : revenue - cost;
    const grossMarginCents: Kpi = {
      previous: margin(revenueCents.previous, aiCostEurCents.previous),
      value: revenueCents.value - aiCostEurCents.value,
    };

    return { aiCostEurCents, grossMarginCents, revenueCents };
  }

  private async readSeries(window: ResolvedWindow) {
    const { activity, aiCostsStore, revenue, usdToEurRate } = this.deps;
    const [sales, costs, signups, active] = await Promise.all([
      revenue.readSalesSeries(window.current, window.bucket),
      aiCostsStore.readSeries(window.current, window.bucket),
      activity.readSignupSeries(window.current, window.bucket),
      activity.readActiveSeries(window.current, window.bucket),
    ]);
    // Costs come per feature; the overview only needs their total per bucket.
    const costTotals = new Map<string, number>();
    for (const row of costs) {
      costTotals.set(row.date, (costTotals.get(row.date) ?? 0) + row.costUsd);
    }
    const aiCostCents = [...costTotals].map(([date, usd]) => ({
      date,
      value: Math.round(usd * usdToEurRate * 100),
    }));
    const dates = bucketDates(
      window,
      oldestDate(sales.revenueCents, aiCostCents, signups, active),
    );

    return {
      revenueVsCost: fillSeries(dates, {
        aiCostCents,
        revenueCents: sales.revenueCents,
      }),
      signupsVsActive: fillSeries(dates, { activeUsers: active, signups }),
    };
  }
}
