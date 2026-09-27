import type {
  AcquisitionMetrics,
  AiCostMetrics,
  Kpi,
  MarketMetrics,
  OverviewMetrics,
  RankedItem,
  RevenueMetrics,
  UsageMetrics,
} from "@cvforge/types";
import { toCsv } from "../shared/csv";

type MetricRow = { metric: string; unit: string; value: string };

const HEADERS: Array<keyof MetricRow> = ["metric", "value", "unit"];

export type CockpitSnapshot = {
  overview: OverviewMetrics;
  revenue: RevenueMetrics;
  aiCosts: AiCostMetrics;
  usage: UsageMetrics;
  market: MarketMetrics;
  acquisition: AcquisitionMetrics;
};

const row = (metric: string, value: string | number | null, unit: string): MetricRow => ({
  metric,
  unit,
  value: value === null ? "" : String(value),
});

/** A key ending in `Cents` is money; it is written in euros, like a receipt. */
function kpiRows(prefix: string, kpis: Record<string, Kpi>): MetricRow[] {
  return Object.entries(kpis).flatMap(([name, kpi]) => {
    const cents = name.endsWith("Cents");
    const format = (value: number | null) =>
      value === null ? null : cents ? (value / 100).toFixed(2) : Number(value.toFixed(6));
    const unit = cents ? "eur" : name.endsWith("Usd") ? "usd" : "count";

    return [
      row(`${prefix}_${name}`, format(kpi.value), unit),
      row(`${prefix}_${name}_previous`, format(kpi.previous), unit),
    ];
  });
}

function rankRows(prefix: string, items: RankedItem[]): MetricRow[] {
  return items.map((item) =>
    row(`${prefix}:${item.detail ? `${item.label} (${item.detail})` : item.label}`, item.count, "count"),
  );
}

function revenueRows(revenue: RevenueMetrics): MetricRow[] {
  return [
    ...kpiRows("revenue", revenue.kpis),
    row("revenue_repeat_buyer_rate", revenue.repeatBuyerRate, "percent"),
    row("revenue_median_days_to_first_purchase", revenue.medianDaysToFirstPurchase, "days"),
    row("revenue_abandoned_checkout_rate", revenue.abandonedCheckoutRate, "percent"),
    ...Object.entries(revenue.funnel).map(([step, value]) => row(`funnel_${step}`, value, "accounts")),
    ...Object.entries(revenue.credits).map(([kind, value]) => row(`credits_${kind}`, value, "credits")),
    ...revenue.offers.map((offer) =>
      row(`offer_revenue:${offer.offerName}`, (offer.revenueCents / 100).toFixed(2), "eur"),
    ),
  ];
}

function aiCostRows(aiCosts: AiCostMetrics): MetricRow[] {
  return [
    row("ai_tracking_since", aiCosts.trackingSince, "iso8601"),
    row("usd_to_eur_rate", aiCosts.usdToEurRate, "rate"),
    ...kpiRows("ai", aiCosts.kpis),
    ...aiCosts.features.flatMap((feature) => [
      row(`ai_feature_cost:${feature.feature}`, feature.costUsd.toFixed(6), "usd"),
      row(`ai_feature_calls:${feature.feature}`, feature.calls, "count"),
    ]),
    ...aiCosts.models.map((model) => row(`ai_model_cost:${model.model}`, model.costUsd.toFixed(6), "usd")),
    ...aiCosts.units.flatMap((unit) => [
      row(`unit_cost:${unit.action}`, unit.costPerUnitEurCents === null ? null : (unit.costPerUnitEurCents / 100).toFixed(4), "eur"),
      row(`unit_margin:${unit.action}`, unit.marginRate, "percent"),
    ]),
    row("openrouter_remaining", aiCosts.balance.remainingUsd, "usd"),
    row("openrouter_runway", aiCosts.balance.runwayDays, "days"),
  ];
}

function acquisitionRows(acquisition: AcquisitionMetrics): MetricRow[] {
  return acquisition.funnels.flatMap((funnel) => {
    const prefix = `funnel_${funnel.tool}`;
    return [
      row(`${prefix}_visitors`, funnel.visitors, "visitors"),
      row(`${prefix}_results`, funnel.results, "visitors"),
      row(`${prefix}_cta_clicks`, funnel.ctaClicks, "visitors"),
      row(`${prefix}_emails_submitted`, funnel.emailsSubmitted, "visitors"),
      row(`${prefix}_accounts_activated`, funnel.accountsActivated, "visitors"),
    ];
  });
}

/**
 * One row per metric rather than one wide row: the set of metrics grows, and
 * a tall file keeps older exports diffable against newer ones. An unknown
 * value is an empty cell, never a 0.
 */
export function buildMetricsCsv(snapshot: CockpitSnapshot) {
  const { acquisition, aiCosts, market, overview, revenue, usage } = snapshot;

  return toCsv(HEADERS, [
    row("generated_at", overview.window.generatedAt, "iso8601"),
    row("period", overview.window.period, "days"),
    row("since", overview.window.since, "iso8601"),
    ...kpiRows("overview", overview.kpis),
    ...revenueRows(revenue),
    ...aiCostRows(aiCosts),
    ...kpiRows("usage", usage.kpis),
    row("usage_onboarding_rate", usage.onboardingRate, "percent"),
    row("usage_interviews_completed", usage.interviews.completed, "count"),
    ...rankRows("market_company", market.topCompanies),
    ...rankRows("market_job_title", market.topJobTitles),
    ...rankRows("market_checked_company", market.topCheckedCompanies),
    ...rankRows("market_searched_job", market.topSearchedJobs),
    ...acquisitionRows(acquisition),
  ]);
}

/** Timestamped and dated by period, so successive exports never collide. */
export function buildMetricsCsvFilename(generatedAt: string, period: string) {
  const span = period === "all" ? "tout" : `${period}j`;

  return `cvforge-pilotage-${span}-${generatedAt.slice(0, 19).replaceAll(":", "-")}.csv`;
}
