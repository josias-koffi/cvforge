import type { AcquisitionTool } from "@cvforge/types";
import type { OpenRouterBalance } from "../ai/openrouter-balance.service";

export const METRICS_STORE = Symbol("METRICS_STORE");

/** Raw counters, straight from SQL. No currency conversion, no derivation. */
export type ProductCounters = {
  activeUserCount: number;
  applicationCount: number;
  creditsConsumed: number;
  creditsGranted: number;
  creditsSold: number;
  cvImportCount: number;
  generatedCvCount: number;
  generatedLetterCount: number;
  grossRevenueCents: number;
  interviewCompletedCount: number;
  interviewCount: number;
  offerEnrichmentCount: number;
  paidOrderCount: number;
  totalAdminCount: number;
  totalUserCount: number;
};

/**
 * ATS figures, per engine version.
 *
 * Never pooled across versions: the scale is versioned (ADR-021), and a mean
 * mixing 1.0.0 with 1.1.0 would measure the rescale, not the CVs.
 */
export type AtsScoreByEngine = {
  engineVersion: string;
  scoredCvCount: number;
  averageScore: number;
};

export type AtsCounters = {
  scoresByEngine: AtsScoreByEngine[];
  publicScanCount: number;
  unlockedScanCount: number;
  /** Leads whose address now has an account — the funnel's actual output. */
  convertedLeadCount: number;
};

/** Distinct visitors of one step of one tool over the window, straight from SQL. */
export type AcquisitionStepCount = {
  tool: string;
  step: string;
  visitors: number;
};

/**
 * The funnel of one free tool over the dashboard window (US-131).
 *
 * Every figure counts visitors once per day and per step, never page loads.
 * `accountsActivated` is null for a tool that has no email capture yet: there
 * is no address to join on, which is not the same fact as nobody signing up.
 */
export type AcquisitionFunnel = {
  tool: AcquisitionTool;
  visitors: number;
  results: number;
  ctaClicks: number;
  emailsSubmitted: number;
  accountsActivated: number | null;
};

export type MetricsStore = {
  readProductCounters: (activeWindowDays: number) => Promise<ProductCounters>;
  readAtsCounters: () => Promise<AtsCounters>;
  /** `sinceDay` is an ISO date, inclusive. */
  readAcquisitionSteps: (sinceDay: string) => Promise<AcquisitionStepCount[]>;
  /** Addresses that unlocked a public scan since then and now have an account. */
  readAtsActivations: (since: Date) => Promise<number>;
  /**
   * Accounts that redeemed a comparator (US-136) or interview questions
   * (US-141) link since then: one application carrying the tool's source
   * label each.
   */
  readOfferLeadActivations: (
    sourceLabel: string,
    since: Date,
  ) => Promise<number>;
  /**
   * Accounts that redeemed a job market (US-137) or employer check (US-139)
   * link: the search it wrote or opened carries the tool's origin.
   */
  readSearchLeadActivations: (
    tool: SearchLeadTool,
    since: Date,
  ) => Promise<number>;
};

/** The free tools whose link writes a search rather than a record of its own. */
export type SearchLeadTool = "job_market" | "company_check";

export type AdminMetrics = {
  generatedAt: string;
  activeWindowDays: number;
  documents: {
    cvImportCount: number;
    generatedCvCount: number;
    generatedLetterCount: number;
    offerEnrichmentCount: number;
  };
  interviews: { completedCount: number; totalCount: number };
  users: { activeCount: number; adminCount: number; totalCount: number };
  applications: { totalCount: number };
  /**
   * `unlockRate` and `conversionRate` are null rather than 0 when there is
   * nothing to divide by: "no scans yet" and "nobody converted" are different
   * facts, and a 0 % on an empty funnel reads as a failure.
   */
  ats: {
    scoresByEngine: AtsScoreByEngine[];
    publicScanCount: number;
    unlockedScanCount: number;
    convertedLeadCount: number;
    unlockRate: number | null;
    conversionRate: number | null;
  };
  /** One funnel per free tool, over `activeWindowDays`. */
  acquisition: AcquisitionFunnel[];
  credits: { consumed: number; granted: number; sold: number };
  revenue: { currency: "eur"; grossCents: number; paidOrderCount: number };
  /**
   * `null` when supervision is off or the balance is unreadable — the only
   * source of API spend we have. OpenRouter reports usage **since the account
   * was created**, so cost and margin are all-time figures, never per period.
   */
  apiCost: {
    estimatedEurCents: number;
    stale: boolean;
    usdToEurRate: number;
    usedUsd: number;
  } | null;
  /** `null` whenever `apiCost` is, since it cannot be derived without it. */
  margin: { netEurCents: number; ratio: number | null } | null;
};

export type OpenRouterBalanceResponse = {
  /** In OpenRouter credits (USD). */
  alertThreshold: number;
  /** `null` when supervision is off or the first read failed. */
  balance: OpenRouterBalance | null;
  isLowBalance: boolean;
  /** False when `OPENROUTER_MANAGEMENT_API_KEY` is unset. */
  supervisionEnabled: boolean;
};
