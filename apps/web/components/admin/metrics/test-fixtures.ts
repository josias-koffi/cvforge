import type {
  AcquisitionMetrics,
  AiCostMetrics,
  Kpi,
  MarketMetrics,
  MetricsWindow,
  OverviewMetrics,
  RevenueMetrics,
  UsageMetrics,
} from "@cvforge/types"

/**
 * Cockpit responses for the render tests: a busy period, and the fresh
 * database every tab must also survive — zeros, empty lists, nulls.
 */

export const WINDOW: MetricsWindow = {
  bucket: "day",
  generatedAt: "2026-09-25T08:00:00.000Z",
  period: "30",
  previousSince: "2026-07-27T00:00:00.000Z",
  since: "2026-08-26T00:00:00.000Z",
}

const EMPTY_WINDOW: MetricsWindow = {
  ...WINDOW,
  period: "all",
  previousSince: null,
  since: null,
}

const zero: Kpi = { previous: null, value: 0 }
const kpi = (value: number, previous: number | null = null): Kpi => ({
  previous,
  value,
})

export const OVERVIEW: OverviewMetrics = {
  insights: [
    {
      detail: "Le coût IA a doublé alors que le CA stagne.",
      href: "/admin/metrics/couts-ia",
      id: "ai-cost-up",
      tone: "bad",
      title: "Coût IA en hausse",
    },
  ],
  kpis: {
    activeUsers: kpi(40, 32),
    aiCostEurCents: kpi(1200, 600),
    grossMarginCents: kpi(8800, 9400),
    newBuyers: kpi(5, 4),
    revenueCents: kpi(10000, 10000),
    signups: kpi(25, 20),
  },
  revenueVsCost: [
    { aiCostCents: 500, date: "2026-09-24", revenueCents: 4000 },
    { aiCostCents: 700, date: "2026-09-25", revenueCents: 6000 },
  ],
  signupsVsActive: [
    { activeUsers: 20, date: "2026-09-24", signups: 10 },
    { activeUsers: 20, date: "2026-09-25", signups: 15 },
  ],
  window: WINDOW,
}

export const EMPTY_OVERVIEW: OverviewMetrics = {
  insights: [],
  kpis: {
    activeUsers: zero,
    aiCostEurCents: zero,
    grossMarginCents: zero,
    newBuyers: zero,
    revenueCents: zero,
    signups: zero,
  },
  revenueVsCost: [],
  signupsVsActive: [],
  window: EMPTY_WINDOW,
}

export const REVENUE: RevenueMetrics = {
  abandonedCheckoutRate: 20,
  credits: { consumed: 300, granted: 20, sold: 500, welcome: 100 },
  funnel: {
    firstGeneration: 30,
    firstPurchase: 10,
    onboarded: 60,
    repeatPurchase: 2,
    signups: 100,
  },
  kpis: {
    averageBasketCents: kpi(990, 900),
    buyers: kpi(9, 8),
    paidOrders: kpi(12, 10),
    revenueCents: kpi(11880, 9000),
    revenuePerActiveCents: kpi(297, 280),
  },
  medianDaysToFirstPurchase: 3,
  offers: [
    {
      credits: 250,
      offerName: "Pack Essentiel",
      orders: 10,
      revenueCents: 9900,
    },
  ],
  repeatBuyerRate: 22.2,
  series: [{ date: "2026-09-25", orders: 12, revenueCents: 11880 }],
  window: WINDOW,
}

export const EMPTY_REVENUE: RevenueMetrics = {
  abandonedCheckoutRate: null,
  credits: { consumed: 0, granted: 0, sold: 0, welcome: 0 },
  funnel: {
    firstGeneration: 0,
    firstPurchase: 0,
    onboarded: 0,
    repeatPurchase: 0,
    signups: 0,
  },
  kpis: {
    averageBasketCents: zero,
    buyers: zero,
    paidOrders: zero,
    revenueCents: zero,
    revenuePerActiveCents: zero,
  },
  medianDaysToFirstPurchase: null,
  offers: [],
  repeatBuyerRate: null,
  series: [],
  window: EMPTY_WINDOW,
}

export const AI_COSTS: AiCostMetrics = {
  balance: { enabled: true, remainingUsd: 12.5, runwayDays: 5.4, stale: false },
  creditValueEurCents: 40,
  features: [
    {
      calls: 40,
      completionTokens: 20000,
      costUsd: 1.2,
      errors: 2,
      feature: "cv_generation",
      promptTokens: 50000,
    },
  ],
  kpis: {
    averageCallCostUsd: kpi(0.03, 0.02),
    calls: kpi(40, 30),
    costUsd: kpi(1.2, 0.6),
    errorRate: kpi(5, 5),
  },
  models: [
    {
      averageDurationMs: 4200,
      calls: 40,
      completionTokens: 20000,
      costUsd: 1.2,
      errorRate: 5,
      fallbackRate: 10,
      model: "openai/gpt-5-mini",
      promptTokens: 50000,
    },
  ],
  series: [{ cv_generation: 1.2, date: "2026-09-25" }],
  trackingSince: "2026-09-20T00:00:00.000Z",
  units: [
    {
      action: "cv_generation",
      costPerUnitEurCents: 3,
      creditsPerUnit: 1,
      marginRate: 92.5,
      revenuePerUnitEurCents: 40,
      units: 40,
    },
    {
      action: "interview_session",
      costPerUnitEurCents: 50,
      creditsPerUnit: 1,
      marginRate: -25,
      revenuePerUnitEurCents: 40,
      units: 12,
    },
  ],
  usdToEurRate: 0.92,
  window: WINDOW,
}

export const EMPTY_AI_COSTS: AiCostMetrics = {
  balance: {
    enabled: false,
    remainingUsd: null,
    runwayDays: null,
    stale: false,
  },
  creditValueEurCents: null,
  features: [],
  kpis: {
    averageCallCostUsd: zero,
    calls: zero,
    costUsd: zero,
    errorRate: zero,
  },
  models: [],
  series: [],
  trackingSince: null,
  units: [],
  usdToEurRate: 0.92,
  window: EMPTY_WINDOW,
}

export const USAGE: UsageMetrics = {
  atsScoresByEngine: [
    { averageScore: 71, engineVersion: "v2", scoredCvCount: 30 },
    { averageScore: 64, engineVersion: "v1", scoredCvCount: 12 },
  ],
  cvTemplates: [{ count: 20, label: "Moderne" }],
  interviews: { abandoned: 3, averageMinutes: 14.5, completed: 9 },
  kpis: {
    applications: kpi(80, 70),
    atsScans: kpi(42, 40),
    cvGenerated: kpi(40, 35),
    cvImported: kpi(15, 10),
    interviews: kpi(12, 10),
    lettersGenerated: kpi(25, 30),
  },
  letterTemplates: [{ count: 12, label: "Classique" }],
  onboardingRate: 64,
  retention: [
    {
      activeAfter30Days: null,
      activeAfter7Days: 45,
      cohort: "2026-09-01",
      signups: 25,
    },
  ],
  series: [
    {
      applications: 80,
      cvGenerated: 40,
      date: "2026-09-25",
      interviews: 12,
      lettersGenerated: 25,
    },
  ],
  window: WINDOW,
}

export const EMPTY_USAGE: UsageMetrics = {
  atsScoresByEngine: [],
  cvTemplates: [],
  interviews: { abandoned: 0, averageMinutes: null, completed: 0 },
  kpis: {
    applications: zero,
    atsScans: zero,
    cvGenerated: zero,
    cvImported: zero,
    interviews: zero,
    lettersGenerated: zero,
  },
  letterTemplates: [],
  onboardingRate: null,
  retention: [],
  series: [],
  window: EMPTY_WINDOW,
}

export const MARKET: MarketMetrics = {
  dailyOffers: {
    applied: 5,
    dismissed: 30,
    proposed: 200,
    saved: 20,
    seen: 100,
  },
  topAppliedCompanies: [{ count: 4, label: "Airbus" }],
  topCheckedCompanies: [{ count: 9, label: "Thales" }],
  topCompanies: [{ count: 6, label: "Airbus" }],
  topJobTitles: [{ count: 8, label: "Développeur" }],
  topSearchedJobs: [{ count: 7, detail: "Gironde", label: "Comptable" }],
  topTargetRoles: [{ count: 3, label: "Data analyst" }],
  window: WINDOW,
}

export const EMPTY_MARKET: MarketMetrics = {
  dailyOffers: { applied: 0, dismissed: 0, proposed: 0, saved: 0, seen: 0 },
  topAppliedCompanies: [],
  topCheckedCompanies: [],
  topCompanies: [],
  topJobTitles: [],
  topSearchedJobs: [],
  topTargetRoles: [],
  window: EMPTY_WINDOW,
}

export const ACQUISITION: AcquisitionMetrics = {
  funnels: [
    {
      accountsActivated: 3,
      ctaClicks: 5,
      emailsSubmitted: 10,
      results: 40,
      tool: "ats",
      visitors: 80,
    },
    {
      accountsActivated: null,
      ctaClicks: 1,
      emailsSubmitted: 0,
      results: 4,
      tool: "job_market",
      visitors: 9,
    },
  ],
  publicAts: { scans: 40, unlockRate: 25, unlocked: 10 },
  series: [{ ats: 80, date: "2026-09-25", job_market: 9 }],
  window: WINDOW,
}

export const EMPTY_ACQUISITION: AcquisitionMetrics = {
  funnels: [],
  publicAts: { scans: 0, unlockRate: null, unlocked: 0 },
  series: [],
  window: EMPTY_WINDOW,
}

/**
 * A render's visible text with plain spaces and apostrophes, for assertions:
 * counts and rates sit in separate spans, Intl uses narrow no-break spaces
 * and React escapes quotes.
 */
export function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[  ]/g, " ")
}
