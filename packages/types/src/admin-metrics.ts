import type { AcquisitionTool } from "./acquisition";
import type { AiFeature } from "./ai-usage";

/**
 * The admin cockpit (E26): one response per tab, every figure over a period.
 * Shared by the API, which computes them, and the admin, which charts them —
 * the old `AdminMetrics` was copied by hand on both sides.
 */

/** In days, or the whole history. */
export const metricsPeriods = ["7", "30", "90", "365", "all"] as const;
export type MetricsPeriod = (typeof metricsPeriods)[number];
export const DEFAULT_METRICS_PERIOD: MetricsPeriod = "30";

export function isMetricsPeriod(value: unknown): value is MetricsPeriod {
  return (metricsPeriods as readonly unknown[]).includes(value);
}

/** How a series is cut: a day per point up to 90 days, then weeks, then months. */
export type MetricsBucket = "day" | "week" | "month";

export type MetricsWindow = {
  period: MetricsPeriod;
  /** ISO timestamp, inclusive; null for the whole history. */
  since: string | null;
  /** The same length just before `since`; null when there is none. */
  previousSince: string | null;
  bucket: MetricsBucket;
  generatedAt: string;
};

/**
 * A figure and the same figure over the previous period. `previous` is null
 * when there is no previous period (the whole history), never 0: "nothing
 * before" and "zero before" read differently.
 */
export type Kpi = { value: number; previous: number | null };

/** One point of a series: `date` is the bucket's first day, ISO. */
export type SeriesPoint<K extends string> = { date: string } & Record<K, number>;

/** A share in percent, or null when there is nothing to divide by. */
export type Rate = number | null;

export type InsightTone = "good" | "warn" | "bad" | "info";

/** A finding worth the owner's attention, computed from the figures. */
export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  /** The cockpit tab that explains it. */
  href: string;
};

/* ---------------------------------------------------------------- overview */

export type OverviewMetrics = {
  window: MetricsWindow;
  kpis: {
    revenueCents: Kpi;
    aiCostEurCents: Kpi;
    grossMarginCents: Kpi;
    signups: Kpi;
    activeUsers: Kpi;
    /** Accounts whose first purchase fell in the period. */
    newBuyers: Kpi;
  };
  revenueVsCost: SeriesPoint<"revenueCents" | "aiCostCents">[];
  signupsVsActive: SeriesPoint<"signups" | "activeUsers">[];
  insights: Insight[];
};

/* ----------------------------------------------------------------- revenue */

/**
 * Accounts created in the period, followed down to a second purchase. Each
 * step is a subset of the one before it.
 */
export type ConversionFunnel = {
  signups: number;
  onboarded: number;
  firstGeneration: number;
  firstPurchase: number;
  repeatPurchase: number;
};

export type OfferSales = {
  offerName: string;
  orders: number;
  credits: number;
  revenueCents: number;
};

export type RevenueMetrics = {
  window: MetricsWindow;
  kpis: {
    revenueCents: Kpi;
    paidOrders: Kpi;
    averageBasketCents: Kpi;
    buyers: Kpi;
    /** Revenue per active account over the period. */
    revenuePerActiveCents: Kpi;
  };
  /** Of the accounts that ever paid, the share that paid twice or more. */
  repeatBuyerRate: Rate;
  /** Days from signup to first purchase, median, over first purchases in the period. */
  medianDaysToFirstPurchase: number | null;
  /** Checkouts opened in the period that never got paid. */
  abandonedCheckoutRate: Rate;
  series: SeriesPoint<"revenueCents" | "orders">[];
  funnel: ConversionFunnel;
  offers: OfferSales[];
  credits: {
    sold: number;
    welcome: number;
    granted: number;
    consumed: number;
  };
};

/* ---------------------------------------------------------------- AI costs */

export type AiFeatureCost = {
  feature: AiFeature;
  calls: number;
  errors: number;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
};

export type AiModelCost = {
  model: string;
  calls: number;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  /** Percent of the calls it answered as a fallback. */
  fallbackRate: Rate;
  errorRate: Rate;
  averageDurationMs: number;
};

/**
 * What a billed unit costs us against what it brings in: a CV, a letter, a
 * minute of interview. `revenuePerUnitEurCents` values the credits charged at
 * the average price a credit sold for.
 */
export type UnitEconomics = {
  action: string;
  units: number;
  creditsPerUnit: number;
  costPerUnitEurCents: number | null;
  revenuePerUnitEurCents: number | null;
  /** Percent of the unit's revenue left after its AI cost. */
  marginRate: Rate;
};

export type OpenRouterBalanceSummary = {
  enabled: boolean;
  remainingUsd: number | null;
  /** Days left at the period's daily AI spend; null without spend or balance. */
  runwayDays: number | null;
  stale: boolean;
};

export type AiCostMetrics = {
  window: MetricsWindow;
  usdToEurRate: number;
  /** The first recorded call: costs before it were never measured. */
  trackingSince: string | null;
  kpis: {
    costUsd: Kpi;
    calls: Kpi;
    errorRate: Kpi;
    averageCallCostUsd: Kpi;
  };
  /** One key per feature present in the period, in USD. */
  series: Array<{ date: string } & Partial<Record<AiFeature, number>>>;
  features: AiFeatureCost[];
  models: AiModelCost[];
  units: UnitEconomics[];
  /** Average price a credit sold for, all time; null before any sale. */
  creditValueEurCents: number | null;
  balance: OpenRouterBalanceSummary;
};

/* ------------------------------------------------------------------- usage */

export type RankedItem = { label: string; count: number; detail?: string };

export type RetentionCohort = {
  /** First day of the signup month, ISO. */
  cohort: string;
  signups: number;
  /** Percent active 7 and 30 days after signing up, or later. */
  activeAfter7Days: Rate;
  activeAfter30Days: Rate;
};

export type UsageMetrics = {
  window: MetricsWindow;
  kpis: {
    applications: Kpi;
    cvGenerated: Kpi;
    lettersGenerated: Kpi;
    cvImported: Kpi;
    interviews: Kpi;
    atsScans: Kpi;
  };
  series: SeriesPoint<"applications" | "cvGenerated" | "lettersGenerated" | "interviews">[];
  onboardingRate: Rate;
  interviews: {
    completed: number;
    abandoned: number;
    averageMinutes: number | null;
  };
  cvTemplates: RankedItem[];
  letterTemplates: RankedItem[];
  /** Never pooled across engine versions (ADR-021). */
  atsScoresByEngine: Array<{
    engineVersion: string;
    scoredCvCount: number;
    averageScore: number;
  }>;
  retention: RetentionCohort[];
};

/* ------------------------------------------------------------------ market */

export type MarketMetrics = {
  window: MetricsWindow;
  /** From the offers candidates applied to. */
  topCompanies: RankedItem[];
  topJobTitles: RankedItem[];
  /** From the searches candidates set up. */
  topTargetRoles: RankedItem[];
  /** From the free tools, visitors included. */
  topCheckedCompanies: RankedItem[];
  topSearchedJobs: RankedItem[];
  /** The morning digest's offers, down to an application. */
  dailyOffers: {
    proposed: number;
    seen: number;
    saved: number;
    applied: number;
    dismissed: number;
  };
  topAppliedCompanies: RankedItem[];
};

/* ------------------------------------------------------------- acquisition */

/**
 * The funnel of one free tool. `accountsActivated` is null for a tool that
 * has no email capture: there is no address to join on.
 */
export type AcquisitionFunnel = {
  tool: AcquisitionTool;
  visitors: number;
  results: number;
  ctaClicks: number;
  emailsSubmitted: number;
  accountsActivated: number | null;
};

export type AcquisitionMetrics = {
  window: MetricsWindow;
  funnels: AcquisitionFunnel[];
  /** Daily visitors per tool; the events are kept 90 days. */
  series: Array<{ date: string } & Partial<Record<AcquisitionTool, number>>>;
  publicAts: {
    scans: number;
    unlocked: number;
    unlockRate: Rate;
  };
};
