import { toCsv } from "../shared/csv";
import type { AdminMetrics } from "./metrics.types";

type MetricRow = { metric: string; unit: string; value: string };

const HEADERS: Array<keyof MetricRow> = ["metric", "value", "unit"];

function centsToEuros(cents: number) {
  return (cents / 100).toFixed(2);
}

/**
 * One row per metric rather than one wide row: the set of metrics will grow,
 * and a tall file keeps older exports diffable against newer ones.
 */
export function buildMetricsCsv(metrics: AdminMetrics) {
  const rows: MetricRow[] = [
    { metric: "generated_at", unit: "iso8601", value: metrics.generatedAt },
    {
      metric: "active_window_days",
      unit: "days",
      value: String(metrics.activeWindowDays),
    },
    { metric: "users_total", unit: "count", value: String(metrics.users.totalCount) },
    { metric: "users_admin", unit: "count", value: String(metrics.users.adminCount) },
    { metric: "users_active", unit: "count", value: String(metrics.users.activeCount) },
    {
      metric: "applications_total",
      unit: "count",
      value: String(metrics.applications.totalCount),
    },
    {
      metric: "cv_generated",
      unit: "count",
      value: String(metrics.documents.generatedCvCount),
    },
    {
      metric: "letters_generated",
      unit: "count",
      value: String(metrics.documents.generatedLetterCount),
    },
    {
      metric: "cv_imported",
      unit: "count",
      value: String(metrics.documents.cvImportCount),
    },
    {
      metric: "offers_enriched",
      unit: "count",
      value: String(metrics.documents.offerEnrichmentCount),
    },
    {
      metric: "interviews_total",
      unit: "count",
      value: String(metrics.interviews.totalCount),
    },
    {
      metric: "interviews_completed",
      unit: "count",
      value: String(metrics.interviews.completedCount),
    },
    { metric: "credits_sold", unit: "credits", value: String(metrics.credits.sold) },
    {
      metric: "credits_granted",
      unit: "credits",
      value: String(metrics.credits.granted),
    },
    {
      metric: "credits_consumed",
      unit: "credits",
      value: String(metrics.credits.consumed),
    },
    {
      metric: "revenue_gross",
      unit: metrics.revenue.currency,
      value: centsToEuros(metrics.revenue.grossCents),
    },
    {
      metric: "orders_paid",
      unit: "count",
      value: String(metrics.revenue.paidOrderCount),
    },
    {
      metric: "api_cost_estimated",
      unit: "eur",
      value: metrics.apiCost ? centsToEuros(metrics.apiCost.estimatedEurCents) : "",
    },
    {
      metric: "api_usage",
      unit: "usd",
      value: metrics.apiCost ? metrics.apiCost.usedUsd.toFixed(2) : "",
    },
    {
      metric: "usd_to_eur_rate",
      unit: "rate",
      value: metrics.apiCost ? String(metrics.apiCost.usdToEurRate) : "",
    },
    {
      metric: "margin_net",
      unit: "eur",
      value: metrics.margin ? centsToEuros(metrics.margin.netEurCents) : "",
    },
    {
      metric: "margin_ratio",
      unit: "ratio",
      value:
        metrics.margin?.ratio === null || metrics.margin === null
          ? ""
          : metrics.margin.ratio.toFixed(4),
    },
    ...metrics.acquisition.flatMap(funnelRows),
  ];

  return toCsv(HEADERS, rows);
}

/**
 * The same funnel the dashboard shows, one row per step. An activation that
 * cannot be measured yet is an empty value, not a 0.
 */
function funnelRows(funnel: AdminMetrics["acquisition"][number]): MetricRow[] {
  const prefix = `funnel_${funnel.tool}`;
  const unit = "visitors";

  return [
    { metric: `${prefix}_visitors`, unit, value: String(funnel.visitors) },
    { metric: `${prefix}_results`, unit, value: String(funnel.results) },
    { metric: `${prefix}_cta_clicks`, unit, value: String(funnel.ctaClicks) },
    {
      metric: `${prefix}_emails_submitted`,
      unit,
      value: String(funnel.emailsSubmitted),
    },
    {
      metric: `${prefix}_accounts_activated`,
      unit,
      value:
        funnel.accountsActivated === null ? "" : String(funnel.accountsActivated),
    },
  ];
}

/** Timestamped, so successive exports never overwrite each other. */
export function buildMetricsCsvFilename(generatedAt: string) {
  return `cvforge-metrics-${generatedAt.slice(0, 19).replaceAll(":", "-")}.csv`;
}
