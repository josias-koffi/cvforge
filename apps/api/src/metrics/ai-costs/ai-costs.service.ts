import {
  aiFeatures,
  type AiCostMetrics,
  type AiFeature,
  type OpenRouterBalanceSummary,
} from "@cvforge/types";
import type { OpenRouterBalanceService } from "../../ai/openrouter-balance.service";
import type { PgRevenueStore } from "../revenue/revenue.pg-store";
import {
  percent,
  rangeDays,
  toWindowDto,
  type Range,
  type ResolvedWindow,
} from "../shared/metrics-window";
import { bucketDates, oldestDate } from "../shared/time-series";
import type { AiCostTotals, PgAiCostsStore } from "./ai-costs.pg-store";
import { buildUnitEconomics } from "./unit-economics";

type BalanceReader = Pick<OpenRouterBalanceService, "getBalance" | "isEnabled">;

/** The "Coûts IA" tab: what each feature, model and billed unit costs. */
export class AiCostMetricsService {
  constructor(
    private readonly store: PgAiCostsStore,
    private readonly revenue: Pick<PgRevenueStore, "readCreditValueCents">,
    private readonly balance: BalanceReader,
    private readonly usdToEurRate: number,
  ) {}

  async read(window: ResolvedWindow): Promise<AiCostMetrics> {
    const trackingSince = await this.store.readTrackingSince();
    // Units billed before tracking began have no cost to set against them:
    // counting them would make every unit look cheaper than it is.
    const measured = clampToTracking(window.current, trackingSince);
    const [current, previous, series, features, models, credits, creditValue, balance] =
      await Promise.all([
        this.store.readTotals(window.current),
        window.previous ? this.store.readTotals(window.previous) : Promise.resolve(null),
        this.store.readSeries(window.current, window.bucket),
        this.store.readByFeature(window.current),
        this.store.readByModel(window.current),
        this.store.readCreditsCharged(measured),
        this.revenue.readCreditValueCents(),
        this.balance.isEnabled ? this.balance.getBalance() : Promise.resolve(null),
      ]);
    // The daily pace is read over the days actually measured, not the whole
    // period: a week that started being tracked this morning is one day.
    const days = rangeDays(measured, window.now, trackingSince);

    return {
      balance: summarizeBalance(balance, current.costUsd, days),
      creditValueEurCents: creditValue === null ? null : Math.round(creditValue * 10) / 10,
      features,
      kpis: buildKpis(current, previous),
      models: models.map(({ errors, fallbacks, ...model }) => ({
        ...model,
        errorRate: percent(errors, model.calls),
        fallbackRate: percent(fallbacks, model.calls),
      })),
      series: pivotSeries(bucketDates(window, oldestDate(
        series.map((row) => ({ date: row.date, value: row.costUsd })),
      )), series),
      trackingSince: trackingSince?.toISOString() ?? null,
      units: buildUnitEconomics({
        creditValueEurCents: creditValue,
        creditsCharged: credits,
        features,
        usdToEurRate: this.usdToEurRate,
      }),
      usdToEurRate: this.usdToEurRate,
      window: toWindowDto(window),
    };
  }
}

function clampToTracking(range: Range, trackingSince: Date | null): Range {
  if (!trackingSince) return { from: range.to ?? new Date(), to: range.to };
  if (range.from && range.from > trackingSince) return range;

  return { from: trackingSince, to: range.to };
}

function buildKpis(
  current: AiCostTotals,
  previous: AiCostTotals | null,
): AiCostMetrics["kpis"] {
  const errorRate = (totals: AiCostTotals) => percent(totals.errors, totals.calls) ?? 0;
  const perCall = (totals: AiCostTotals) =>
    totals.calls > 0 ? totals.costUsd / totals.calls : 0;

  return {
    averageCallCostUsd: {
      previous: previous ? perCall(previous) : null,
      value: perCall(current),
    },
    calls: { previous: previous?.calls ?? null, value: current.calls },
    costUsd: { previous: previous?.costUsd ?? null, value: current.costUsd },
    errorRate: {
      previous: previous ? errorRate(previous) : null,
      value: errorRate(current),
    },
  };
}

/**
 * Days of balance left at the period's pace. Null without a balance, or
 * without spend to extrapolate from — "never runs out" is not an answer.
 */
export function summarizeBalance(
  balance: { remaining: number; stale: boolean } | null,
  periodCostUsd: number,
  periodDays: number | null,
): OpenRouterBalanceSummary {
  const dailySpend = periodDays ? periodCostUsd / periodDays : 0;

  return {
    enabled: balance !== null,
    remainingUsd: balance?.remaining ?? null,
    runwayDays:
      balance && dailySpend > 0 ? Math.floor(balance.remaining / dailySpend) : null,
    stale: balance?.stale ?? false,
  };
}

/** One row per bucket, one key per feature that spent anything. */
function pivotSeries(
  dates: string[],
  rows: Array<{ date: string; feature: AiFeature; costUsd: number }>,
): AiCostMetrics["series"] {
  const present = aiFeatures.filter((feature) =>
    rows.some((row) => row.feature === feature),
  );

  return dates.map((date) => {
    const point: AiCostMetrics["series"][number] = { date };
    for (const feature of present) {
      point[feature] =
        rows.find((row) => row.date === date && row.feature === feature)?.costUsd ?? 0;
    }
    return point;
  });
}
